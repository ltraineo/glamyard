import Link from "next/link";
import { notFound } from "next/navigation";
import { q } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getPhoto } from "@/lib/photos";
import { relationMap } from "@/lib/friends";

const MSGS: Record<string, string> = {
  tagged: "Tagged.",
  pending: "Tag sent. It shows once they OK it.",
};

export default async function PhotoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string; confirm?: string }>;
}) {
  const me = await requireUser();
  const id = parseInt((await params).id, 10);
  if (!Number.isFinite(id)) notFound();
  const photo = await getPhoto(id);
  if (!photo) notFound();
  const { m, confirm } = await searchParams;

  const tags = await q(
    `select t.user_id, t.status, t.tagged_by, u.name
     from photo_tags t join users u on u.id = t.user_id
     where t.photo_id = $1 order by u.name`,
    [id]
  );
  // Approved tags are visible to every member. A pending tag is visible only to
  // the person tagged and the person who tagged them.
  const visibleTags = tags.filter(
    (t) => t.status === "approved" || t.user_id === me.id || t.tagged_by === me.id
  );
  const myTag = tags.find((t) => t.user_id === me.id);
  const mine = photo.user_id === me.id;
  const canDelete = mine || me.is_admin;

  // Tag choices: people going to the event first, then everyone else.
  const rels = await relationMap(me.id);
  const people = await q(
    `select u.id, u.name, exists (select 1 from checkins c where c.user_id = u.id and c.event_id = $1) as going
     from users u where u.id not in (select user_id from photo_tags where photo_id = $2)
     order by going desc, u.name`,
    [photo.event_id, id]
  );
  const back = `/events/${photo.event_slug}#photos`;
  const here = `/photos/${id}`;

  return (
    <>
      <p className="crumb">
        <Link href={back}>← {photo.event_name}</Link>
      </p>

      {confirm === "delete" && canDelete && (
        <div className="confirm-bar" role="alert">
          <p>Delete this photo for everyone? This can&apos;t be undone.</p>
          <div className="row-actions">
            <form method="post" action="/api/photo-delete">
              <input type="hidden" name="photo_id" value={id} />
              <button className="btn btn-small btn-danger" type="submit">
                Delete it
              </button>
            </form>
            <Link className="link small" href={back}>
              Cancel
            </Link>
          </div>
        </div>
      )}

      <figure className="photo-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/photos/${id}/full`} alt={photo.caption || `Photo at ${photo.event_name}`} width={photo.width} height={photo.height} />
        <figcaption>
          {photo.caption && <p className="photo-caption">{photo.caption}</p>}
          <p className="muted small">
            Posted by{" "}
            {photo.user_id ? <Link href={`/people/${photo.user_id}`}>{photo.poster_name}</Link> : "a former member"}
          </p>
        </figcaption>
      </figure>

      <section className="photo-danger">
        {canDelete && (
          <form method="post" action="/api/photo-delete">
            <input type="hidden" name="photo_id" value={id} />
            <button className="btn btn-small btn-danger" type="submit">
              {mine ? "Delete my photo" : "Delete photo (admin)"}
            </button>
          </form>
        )}
        {!mine && (
          <details>
            <summary className="btn btn-small btn-quiet">{myTag ? "Take this down" : "I'm in this photo. Take it down."}</summary>
            <form method="post" action="/api/photo-takedown" className="takedown">
              <input type="hidden" name="photo_id" value={id} />
              <p className="muted small">
                This removes the photo for everyone, right away. Your name is noted in the admin log.
              </p>
              <button className="btn btn-small" type="submit">
                Remove it
              </button>
            </form>
          </details>
        )}
      </section>

      {m && MSGS[m] && <p className="ok small">{MSGS[m]}</p>}

      <h2 className="month">In this photo</h2>
      {visibleTags.length === 0 ? (
        <p className="muted small">Nobody tagged.</p>
      ) : (
        <ul className="tag-list">
          {visibleTags.map((t) => {
            const canRemove = t.user_id === me.id || t.tagged_by === me.id || mine || me.is_admin;
            return (
              <li key={t.user_id}>
                <Link href={`/people/${t.user_id}`}>{t.name}</Link>
                {t.status === "pending" && <span className="tag">Awaiting OK</span>}
                {t.status === "pending" && t.user_id === me.id && (
                  <form method="post" action="/api/tag-approve">
                    <input type="hidden" name="photo_id" value={id} />
                    <input type="hidden" name="next" value={here} />
                    <button className="link small" type="submit">Approve</button>
                  </form>
                )}
                {canRemove && (
                  <form method="post" action="/api/tag-remove">
                    <input type="hidden" name="photo_id" value={id} />
                    <input type="hidden" name="user_id" value={t.user_id} />
                    <input type="hidden" name="next" value={here} />
                    <button className="link muted small" type="submit">
                      {t.user_id === me.id ? "Untag me" : "Remove"}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {people.length > 0 && (
        <form method="post" action="/api/photo-tag" className="inline-form">
          <input type="hidden" name="photo_id" value={id} />
          <label className="sr-only" htmlFor="tag-who">Tag someone</label>
          <select id="tag-who" name="user_id" required defaultValue="">
            <option value="" disabled>
              Tag someone…
            </option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id === me.id ? "Me" : p.name}
                {p.going ? "" : " (not going)"}
                {p.id !== me.id && rels.get(p.id) !== "friends" ? " · needs their OK" : ""}
              </option>
            ))}
          </select>
          <button className="btn btn-small" type="submit">
            Tag
          </button>
        </form>
      )}

    </>
  );
}
