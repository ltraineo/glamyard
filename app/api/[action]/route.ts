import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { getUser, startSession, endSession } from "@/lib/auth";
import { linkedinEnabled } from "@/lib/config";
import {
  createFounder,
  createInvite,
  joinWithInvite,
  removeBranch,
  removeMember,
} from "@/lib/members";
import { extractEvent, fetchPage, normalizeUrl } from "@/lib/extract";

function text(fd: FormData, key: string, max = 140) {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}

// Only allow redirects back into this site.
function safePath(p: string, fallback: string) {
  return p.startsWith("/") && !p.startsWith("//") ? p : fallback;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;
  const fd = await req.formData();
  const go = (path: string) => NextResponse.redirect(new URL(path, req.url), 303);

  // ---- Placeholder sign-in. Disabled as soon as LinkedIn is configured. ----
  if (action === "setup" || action === "join" || action === "signin") {
    if (linkedinEnabled) return go("/");
    const email = text(fd, "email").toLowerCase();
    const name = text(fd, "name", 80);
    const headline = text(fd, "headline");

    if (action === "signin") {
      const rows = await q("select id from users where email = $1", [email]);
      if (!rows.length) return go("/?error=unknown");
      await startSession(rows[0].id);
      return go("/events");
    }
    if (action === "setup") {
      if (!name || !email) return go("/setup?error=missing");
      const id = await createFounder({ name, email, headline });
      if (!id) return go("/");
      await startSession(id);
      return go("/events");
    }
    const code = text(fd, "code", 40);
    if (!name || !email) return go(`/invite/${code}?error=missing`);
    const res = await joinWithInvite(code, { name, email, headline });
    if (!res.id) return go(`/invite/${code}?error=${res.error}`);
    await startSession(res.id);
    return go("/events");
  }

  if (action === "signout") {
    await endSession();
    return go("/");
  }

  // ---- Everything below requires a member. ----
  const user = await getUser();
  if (!user) return go("/");

  if (action === "checkin") {
    const eventId = parseInt(text(fd, "event_id"), 10);
    const next = safePath(text(fd, "next", 200), "/events");
    if (Number.isFinite(eventId)) {
      const removed = await q(
        "delete from checkins where user_id = $1 and event_id = $2 returning event_id",
        [user.id, eventId]
      );
      if (!removed.length) {
        await q(
          "insert into checkins (user_id, event_id) select $1, id from events where id = $2 on conflict do nothing",
          [user.id, eventId]
        );
      }
    }
    return go(next);
  }

  if (action === "invite") {
    const code = await createInvite(user);
    return go(code ? "/invites" : "/invites?error=cap");
  }

  if (action === "headline") {
    await q("update users set headline = $1 where id = $2", [text(fd, "headline"), user.id]);
    return go(`/people/${user.id}`);
  }

  if (action === "suggest") {
    const url = normalizeUrl(text(fd, "url", 500));
    if (!url) return go("/events?suggest=bad#suggest");
    const href = url.toString();
    const known = await q(
      `select 1 from events where rtrim(url, '/') = rtrim($1, '/')
       union all select 1 from suggestions where rtrim(url, '/') = rtrim($1, '/') and status = 'pending'`,
      [href]
    );
    if (known.length) return go("/events?suggest=dupe#suggest");
    let draft = { name: "", start: null as string | null, end: null as string | null, city: "" };
    try {
      draft = extractEvent(await fetchPage(url));
    } catch {
      // Couldn't read the page. Keep the link; the admin fills in details.
    }
    await q(
      `insert into suggestions (url, name, start_date, end_date, city, suggested_by)
       values ($1,$2,$3,$4,$5,$6)`,
      [href, draft.name, draft.start, draft.end, draft.city, user.id]
    );
    return go("/events?suggest=ok#suggest");
  }

  if (action === "approve" || action === "dismiss") {
    if (!user.is_admin) return go("/events");
    const id = parseInt(text(fd, "id"), 10);
    if (!Number.isFinite(id)) return go("/admin");
    if (action === "dismiss") {
      await q("update suggestions set status = 'dismissed' where id = $1", [id]);
      return go("/admin#suggestions");
    }
    const name = text(fd, "name", 120);
    const date = (k: string) => (/^\d{4}-\d{2}-\d{2}$/.test(text(fd, k)) ? text(fd, k) : null);
    const start = date("start_date");
    const end = date("end_date") || start;
    const city = text(fd, "city", 80);
    const link = normalizeUrl(text(fd, "url", 500))?.toString() || "";
    if (!name) return go(`/admin?error=name#s${id}`);
    const base =
      `${name} ${start ? start.slice(0, 4) : ""}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60) || "event";
    let slug = base;
    for (let n = 2; (await q("select 1 from events where slug = $1", [slug])).length; n++) {
      slug = `${base}-${n}`;
    }
    const [ev] = await q(
      `insert into events (slug, name, start_date, end_date, city, url)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [slug, name, start, end, city, link]
    );
    await q("update suggestions set status = 'approved', event_id = $1 where id = $2", [ev.id, id]);
    return go("/admin#suggestions");
  }

  if (action === "remove") {
    if (!user.is_admin) return go("/events");
    const id = parseInt(text(fd, "id"), 10);
    if (Number.isFinite(id) && id !== user.id) {
      if (text(fd, "mode") === "branch") await removeBranch(id);
      else await removeMember(id);
    }
    return go("/admin");
  }

  return go("/events");
}
