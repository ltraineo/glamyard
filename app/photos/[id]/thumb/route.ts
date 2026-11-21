import { NextRequest } from "next/server";
import { servePhoto } from "../image";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return servePhoto(req, params, "thumb_jpg");
}
