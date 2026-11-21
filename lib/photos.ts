import sharp from "sharp";
import { q } from "./db";
import { relation } from "./friends";

export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

// Re-encodes every upload. sharp drops all metadata unless asked to keep it,
// so EXIF (including GPS location and camera serials) never gets stored.
export async function processImage(input: Buffer) {
  const base = sharp(input, { failOn: "error", limitInputPixels: 60_000_000 }).rotate();
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error("not an image");
  const full = await base
    .clone()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base
    .clone()
    .resize({ width: 480, height: 480, fit: "cover", position: "attention" })
    .jpeg({ quality: 74, mozjpeg: true })
    .toBuffer();
  return { full: full.data, thumb, width: full.info.width, height: full.info.height };
}

export async function isGoing(userId: number, eventId: number) {
  const r = await q("select 1 from checkins where user_id = $1 and event_id = $2", [userId, eventId]);
  return r.length > 0;
}

export async function getPhoto(id: number) {
  const [p] = await q(
    `select p.id, p.event_id, p.user_id, p.caption, p.width, p.height, p.created_at,
            e.slug as event_slug, e.name as event_name, u.name as poster_name
     from photos p join events e on e.id = p.event_id left join users u on u.id = p.user_id
     where p.id = $1`,
    [id]
  );
  return p || null;
}

// Tags by friends (or yourself) show right away; anyone else's tag waits for
// the tagged person's OK.
export async function addTag(photoId: number, tagger: number, taggee: number) {
  const exists = await q("select 1 from users where id = $1", [taggee]);
  if (!exists.length) return;
  const rel = await relation(tagger, taggee);
  const status = rel === "self" || rel === "friends" ? "approved" : "pending";
  await q(
    `insert into photo_tags (photo_id, user_id, tagged_by, status)
     values ($1,$2,$3,$4) on conflict do nothing`,
    [photoId, taggee, tagger, status]
  );
}

export async function pendingTagCount(userId: number) {
  const [{ n }] = await q(
    "select count(*)::int as n from photo_tags where user_id = $1 and status = 'pending'",
    [userId]
  );
  return n;
}

// Removes a photo and records who removed it and why, for the admin log.
export async function takeDown(photoId: number, byUser: number, reason: string) {
  const p = await getPhoto(photoId);
  if (!p) return;
  await q(
    "insert into photo_takedowns (event_id, poster_id, by_user, reason, caption) values ($1,$2,$3,$4,$5)",
    [p.event_id, p.user_id, byUser, reason, p.caption]
  );
  await q("delete from photos where id = $1", [photoId]);
  return p;
}
