import { randomBytes } from "crypto";
import { q } from "./db";
import { INVITE_CAP } from "./config";

export type Profile = {
  name: string;
  email: string | null;
  headline?: string;
  linkedinSub?: string | null;
  avatarUrl?: string | null;
};

export async function memberCount(): Promise<number> {
  const [{ n }] = await q("select count(*)::int as n from users");
  return n;
}

// The first person in becomes the founder and admin.
export async function createFounder(p: Profile): Promise<number | null> {
  if ((await memberCount()) > 0) return null;
  const [u] = await q(
    `insert into users (name, email, headline, linkedin_sub, avatar_url, is_admin)
     values ($1,$2,$3,$4,$5,true) returning id`,
    [p.name, p.email, p.headline || "", p.linkedinSub || null, p.avatarUrl || null]
  );
  return u.id;
}

export async function findInvite(code: string) {
  const rows = await q(
    `select i.code, i.used_by, u.id as inviter_id, u.name as inviter_name, u.headline as inviter_headline,
            u.avatar_url as inviter_avatar
     from invites i join users u on u.id = i.inviter_id where i.code = $1`,
    [code]
  );
  return rows[0] || null;
}

export async function joinWithInvite(
  code: string,
  p: Profile
): Promise<{ id?: number; error?: string }> {
  const invite = await findInvite(code);
  if (!invite) return { error: "invalid" };
  if (invite.used_by) return { error: "used" };
  if (p.email) {
    const dupe = await q("select 1 from users where email = $1", [p.email]);
    if (dupe.length) return { error: "exists" };
  }
  const [u] = await q(
    `insert into users (name, email, headline, linkedin_sub, avatar_url, invited_by)
     values ($1,$2,$3,$4,$5,$6) returning id`,
    [p.name, p.email, p.headline || "", p.linkedinSub || null, p.avatarUrl || null, invite.inviter_id]
  );
  // Claim the invite. If someone else claimed it in the meantime, back out.
  const claimed = await q(
    "update invites set used_by = $1, used_at = now() where code = $2 and used_by is null returning code",
    [u.id, code]
  );
  if (!claimed.length) {
    await q("delete from users where id = $1", [u.id]);
    return { error: "used" };
  }
  // Whoever sent the invite and the person who accepted it start out as friends.
  await q(
    `insert into friendships (requester_id, addressee_id, status, accepted_at)
     values ($1, $2, 'accepted', now()) on conflict do nothing`,
    [invite.inviter_id, u.id]
  );
  return { id: u.id };
}

export async function createInvite(user: { id: number; is_admin: boolean }) {
  if (INVITE_CAP !== null && !user.is_admin) {
    const [{ n }] = await q("select count(*)::int as n from invites where inviter_id = $1", [user.id]);
    if (n >= INVITE_CAP) return null;
  }
  const code = randomBytes(9).toString("base64url");
  await q("insert into invites (code, inviter_id) values ($1,$2)", [code, user.id]);
  return code;
}

// Remove one member. People they invited are re-parented to whoever invited them.
export async function removeMember(id: number) {
  const rows = await q("select invited_by from users where id = $1", [id]);
  if (!rows.length) return;
  await q("update users set invited_by = $1 where invited_by = $2", [rows[0].invited_by, id]);
  await q("delete from users where id = $1", [id]);
}

// Remove a member and everyone downstream of them in the invite tree.
export async function removeBranch(id: number) {
  await q(
    `with recursive t as (
       select id from users where id = $1
       union all
       select u.id from users u join t on u.invited_by = t.id
     )
     delete from users where id in (select id from t)`,
    [id]
  );
}
