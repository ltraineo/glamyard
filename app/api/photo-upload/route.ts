import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isGoing, MAX_UPLOAD_BYTES, processImage } from "@/lib/photos";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ error: "That upload didn't come through." }, { status: 400 });
  }
  const eventId = parseInt(String(fd.get("event_id") ?? ""), 10);
  const caption = String(fd.get("caption") ?? "").trim().slice(0, 200);
  const file = fd.get("photo");
  if (!Number.isFinite(eventId) || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing photo." }, { status: 400 });
  }
  if (!(await isGoing(user.id, eventId))) {
    return NextResponse.json({ error: "Mark yourself as going to post photos here." }, { status: 403 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "That photo is too large." }, { status: 413 });
  }

  let img;
  try {
    img = await processImage(Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "Couldn't read that photo. Try a JPEG or PNG." }, { status: 415 });
  }

  const [row] = await q(
    `insert into photos (event_id, user_id, caption, full_jpg, thumb_jpg, width, height)
     values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [eventId, user.id, caption, img.full, img.thumb, img.width, img.height]
  );
  return NextResponse.json({ id: row.id });
}
