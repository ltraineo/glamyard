import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { baseUrl, linkedinEnabled } from "@/lib/config";
import { startSession } from "@/lib/auth";
import { createFounder, joinWithInvite, memberCount } from "@/lib/members";

// Step 2: LinkedIn sends the person back with a code. Exchange it, read their
// basic profile, then sign in an existing member or admit a new one by invite.
export async function GET(req: NextRequest) {
  const go = (path: string) => NextResponse.redirect(new URL(path, req.url));
  if (!linkedinEnabled) return go("/");

  let saved: { state?: string; invite?: string; claim?: string } = {};
  try {
    saved = JSON.parse(req.cookies.get("li_state")?.value || "{}");
  } catch {}
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state || state !== saved.state) return go("/?error=linkedin");

  const redirectUri = `${baseUrl(req.nextUrl.origin)}/auth/linkedin/callback`;
  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
    }),
  });
  if (!tokenRes.ok) return go("/?error=linkedin");
  const { access_token } = await tokenRes.json();

  const infoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) return go("/?error=linkedin");
  const info = await infoRes.json();
  const sub = String(info.sub || "");
  if (!sub) return go("/?error=linkedin");

  const profile = {
    name: String(info.name || "Member").slice(0, 80),
    email: info.email ? String(info.email).toLowerCase() : null,
    linkedinSub: sub,
    avatarUrl: info.picture ? String(info.picture) : null,
  };

  // Returning member.
  const existing = await q("select id from users where linkedin_sub = $1", [sub]);
  if (existing.length) {
    await q("update users set avatar_url = $1 where id = $2", [profile.avatarUrl, existing[0].id]);
    await startSession(existing[0].id);
    return go("/events");
  }

  // One-time founder claim: attaches LinkedIn to the founder account when its
  // email differs. Only works while FOUNDER_CLAIM_CODE is set and matches, and
  // only for a founder that has no LinkedIn attached yet.
  const claimCode = process.env.FOUNDER_CLAIM_CODE;
  if (claimCode && saved.claim && saved.claim === claimCode) {
    const founder = await q(
      "select id from users where is_admin and linkedin_sub is null order by id limit 1"
    );
    if (founder.length) {
      await q(
        "update users set linkedin_sub = $1, avatar_url = $2, email = coalesce($3, email) where id = $4",
        [sub, profile.avatarUrl, profile.email, founder[0].id]
      );
      await startSession(founder[0].id);
      return go("/events");
    }
  }

  // A member created with the placeholder sign-in: attach LinkedIn by email.
  // Only when LinkedIn says the email is verified, so nobody can claim an account by email alone.
  if (profile.email && info.email_verified === true) {
    const byEmail = await q(
      "select id from users where email = $1 and linkedin_sub is null",
      [profile.email]
    );
    if (byEmail.length) {
      await q("update users set linkedin_sub = $1, avatar_url = $2 where id = $3", [
        sub,
        profile.avatarUrl,
        byEmail[0].id,
      ]);
      await startSession(byEmail[0].id);
      return go("/events");
    }
  }

  // Very first person in becomes the founder.
  if ((await memberCount()) === 0) {
    const id = await createFounder(profile);
    if (id) {
      await startSession(id);
      return go("/events");
    }
  }

  // Everyone else needs an invite.
  if (!saved.invite) return go("/?error=invite");
  const res = await joinWithInvite(saved.invite, profile);
  if (!res.id) return go(`/invite/${saved.invite}?error=${res.error}`);
  await startSession(res.id);
  return go("/events");
}
