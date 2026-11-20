import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";
import { q } from "./db";

const COOKIE = "sid";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is not set");
  }
  return "dev-only-secret";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export const secureCookies = process.env.NODE_ENV === "production";

export async function startSession(userId: number) {
  const v = String(userId);
  (await cookies()).set(COOKIE, `${v}.${sign(v)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export type User = {
  id: number;
  name: string;
  email: string | null;
  headline: string;
  avatar_url: string | null;
  invited_by: number | null;
  is_admin: boolean;
};

export async function getUser(): Promise<User | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const v = raw.slice(0, dot);
  const sig = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(sign(v));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  const rows = await q(
    "select id, name, email, headline, avatar_url, invited_by, is_admin from users where id = $1",
    [parseInt(v, 10)]
  );
  return (rows[0] as User) || null;
}

export async function requireUser(): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/");
  return u;
}
