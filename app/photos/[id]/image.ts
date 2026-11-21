import { NextRequest } from "next/server";
import { q } from "@/lib/db";
import { getUser } from "@/lib/auth";

// Serves a stored photo to signed-in members only. Photos never change once
// posted, so the browser may cache them, but shared caches may not.
export async function servePhoto(
  _req: NextRequest,
  params: Promise<{ id: string }>,
  column: "full_jpg" | "thumb_jpg"
) {
  const user = await getUser();
  const id = parseInt((await params).id, 10);
  if (!user || !Number.isFinite(id)) return new Response("Not found", { status: 404 });
  const [row] = await q(`select ${column} as data from photos where id = $1`, [id]);
  if (!row) return new Response("Not found", { status: 404 });
  const body = Buffer.from(row.data);
  return new Response(body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(body.length),
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
