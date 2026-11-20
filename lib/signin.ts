import { createHash, randomBytes } from "crypto";
import { q } from "./db";
import { createFounder, joinWithInvite, memberCount } from "./members";
import { APP_NAME, EMAIL_FROM } from "./config";

export type Provider = "google" | "linkedin" | "email";

export type Identity = {
  provider: Provider;
  sub?: string | null; // provider's stable user id (google, linkedin)
  email: string | null;
  emailVerified: boolean;
  name: string;
  headline?: string;
  avatarUrl?: string | null;
};

type Result = { id: number } | { error: string };

const SUB_COLUMN = { google: "google_sub", linkedin: "linkedin_sub" } as const;

// Signs in an existing member, or admits a new one with an invite (or as the
// founder when the site is empty). Only verified emails ever match accounts.
export async function admit(who: Identity, invite?: string | null): Promise<Result> {
  const col = who.provider === "email" ? null : SUB_COLUMN[who.provider];

  if (col && who.sub) {
    const rows = await q(`select id from users where ${col} = $1`, [who.sub]);
    if (rows.length) {
      if (who.avatarUrl) {
        await q("update users set avatar_url = coalesce(avatar_url, $1) where id = $2", [who.avatarUrl, rows[0].id]);
      }
      return { id: rows[0].id };
    }
  }

  if (who.email && who.emailVerified) {
    const rows = await q("select id from users where email = $1", [who.email]);
    if (rows.length) {
      if (col && who.sub) {
        await q(`update users set ${col} = coalesce(${col}, $1) where id = $2`, [who.sub, rows[0].id]);
      }
      if (who.avatarUrl) {
        await q("update users set avatar_url = coalesce(avatar_url, $1) where id = $2", [who.avatarUrl, rows[0].id]);
      }
      return { id: rows[0].id };
    }
  }

  // LinkedIn is for existing members and for adding to a profile, not for joining.
  if (who.provider === "linkedin") return { error: "linkedin-new" };
  if (!who.email || !who.emailVerified) return { error: "unverified" };

  const profile = {
    name: who.name || who.email.split("@")[0],
    email: who.email,
    headline: who.headline || "",
    avatarUrl: who.avatarUrl || null,
    linkedinSub: null,
  };

  let id: number | null = null;
  if ((await memberCount()) === 0) {
    id = await createFounder(profile);
  } else {
    if (!invite) return { error: "invite" };
    const res = await joinWithInvite(invite, profile);
    if (!res.id) return { error: res.error || "invite" };
    id = res.id;
  }
  if (!id) return { error: "invite" };
  if (col && who.sub) await q(`update users set ${col} = $1 where id = $2`, [who.sub, id]);
  return { id };
}

// ---- Email sign-in links ----

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createEmailLink(opts: {
  email: string;
  name?: string;
  headline?: string;
  invite?: string | null;
}): Promise<string | null> {
  // At most 5 links per address per 15 minutes.
  const [{ n }] = await q(
    "select count(*)::int as n from login_tokens where email = $1 and created_at > now() - interval '15 minutes'",
    [opts.email]
  );
  if (n >= 5) return null;
  const token = randomBytes(24).toString("base64url");
  await q(
    `insert into login_tokens (hash, email, name, headline, invite_code, expires_at)
     values ($1,$2,$3,$4,$5, now() + interval '30 minutes')`,
    [hash(token), opts.email, opts.name || "", opts.headline || "", opts.invite || null]
  );
  return token;
}

export async function peekEmailLink(token: string) {
  const rows = await q(
    "select email from login_tokens where hash = $1 and used_at is null and expires_at > now()",
    [hash(token)]
  );
  return rows[0] || null;
}

// Uses up the link. Returns what it was created with, or null if spent or expired.
export async function consumeEmailLink(token: string) {
  const rows = await q(
    `update login_tokens set used_at = now()
     where hash = $1 and used_at is null and expires_at > now()
     returning email, name, headline, invite_code`,
    [hash(token)]
  );
  return rows[0] || null;
}

export async function sendEmailLink(to: string, link: string, joining: boolean) {
  const verb = joining ? "Finish joining" : "Sign in to";
  const html = `<!doctype html><html><body style="margin:0;padding:32px;background:#fafafa;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#16181d">
<div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px">
<p style="font-family:Georgia,serif;font-size:26px;margin:0 0 16px">${APP_NAME}</p>
<p style="margin:0 0 24px;line-height:1.5">Tap the button to ${verb.toLowerCase()} ${APP_NAME}. The link works once and expires in 30 minutes.</p>
<p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:999px">${verb} ${APP_NAME}</a></p>
<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5">If you didn't ask for this, you can ignore it.</p>
</div></body></html>`;
  if (process.env.EMAIL_DEV_LOG === "1" && process.env.NODE_ENV !== "production") {
    console.log(`[email to ${to}] ${link}`);
    return true;
  }
  const text = `${verb} ${APP_NAME}: ${link}\n\nThe link works once and expires in 30 minutes. If you didn't ask for this, ignore this email.`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject: `${verb} ${APP_NAME}`, html, text }),
  });
  if (!res.ok) {
    console.error("resend failed", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

export function validEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 200;
}
