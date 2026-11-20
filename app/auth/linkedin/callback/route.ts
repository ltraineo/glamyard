import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { baseUrl, linkedinEnabled } from "@/lib/config";
import { getUser, startSession } from "@/lib/auth";
import { admit } from "@/lib/signin";

// Step 2: exchange LinkedIn's code and read the basic profile. Then either
// attach LinkedIn to the signed-in member (connect), or sign in a member who
// already has it attached. LinkedIn never creates a new account.
export async function GET(req: NextRequest) {
  const go = (path: string) => NextResponse.redirect(new URL(path, req.url));
  if (!linkedinEnabled) return go("/");

  let saved: { state?: string; connect?: boolean } = {};
  try {
    saved = JSON.parse(req.cookies.get("li_state")?.value || "{}");
  } catch {}
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const me = await getUser();
  const fail = me ? `/people/${me.id}?error=linkedin` : "/?error=linkedin";
  if (!code || !state || state !== saved.state) return go(fail);

  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${baseUrl(req.nextUrl.origin)}/auth/linkedin/callback`,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
    }),
  });
  if (!tokenRes.ok) return go(fail);
  const { access_token } = await tokenRes.json();

  const infoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) return go(fail);
  const info = await infoRes.json();
  const sub = String(info.sub || "");
  if (!sub) return go(fail);
  const picture = info.picture ? String(info.picture) : null;

  if (saved.connect && me) {
    const taken = await q("select id from users where linkedin_sub = $1 and id <> $2", [sub, me.id]);
    if (taken.length) return go(`/people/${me.id}?error=linkedin-taken`);
    await q("update users set linkedin_sub = $1, avatar_url = coalesce($2, avatar_url) where id = $3", [
      sub,
      picture,
      me.id,
    ]);
    return go(`/people/${me.id}`);
  }

  const res = await admit({
    provider: "linkedin",
    sub,
    email: info.email ? String(info.email).toLowerCase() : null,
    emailVerified: info.email_verified === true,
    name: String(info.name || ""),
    avatarUrl: picture,
  });
  if ("error" in res) return go(`/?error=${res.error}`);
  await startSession(res.id);
  return go("/events");
}
