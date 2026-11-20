import { NextRequest, NextResponse } from "next/server";
import { baseUrl, googleEnabled } from "@/lib/config";
import { startSession } from "@/lib/auth";
import { admit } from "@/lib/signin";

// Step 2: exchange Google's code, read the basic profile, sign in or admit.
export async function GET(req: NextRequest) {
  const go = (path: string) => NextResponse.redirect(new URL(path, req.url));
  if (!googleEnabled) return go("/");

  let saved: { state?: string; invite?: string } = {};
  try {
    saved = JSON.parse(req.cookies.get("g_state")?.value || "{}");
  } catch {}
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const back = saved.invite ? `/invite/${saved.invite}` : "/";
  if (!code || !state || state !== saved.state) return go(`${back}?error=google`);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${baseUrl(req.nextUrl.origin)}/auth/google/callback`,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  });
  if (!tokenRes.ok) return go(`${back}?error=google`);
  const { access_token } = await tokenRes.json();

  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) return go(`${back}?error=google`);
  const info = await infoRes.json();
  if (!info.sub) return go(`${back}?error=google`);

  const res = await admit(
    {
      provider: "google",
      sub: String(info.sub),
      email: info.email ? String(info.email).toLowerCase() : null,
      emailVerified: info.email_verified === true,
      name: String(info.name || "").slice(0, 80),
      avatarUrl: info.picture ? String(info.picture) : null,
    },
    saved.invite || null
  );
  if ("error" in res) return go(`${back}?error=${res.error}`);

  const out = go("/events");
  await startSession(res.id);
  out.cookies.delete("g_state");
  return out;
}
