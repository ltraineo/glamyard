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
