import { q } from "./db";

export type Relation = "self" | "friends" | "outgoing" | "incoming" | "none";

export async function relation(me: number, other: number): Promise<Relation> {
  if (me === other) return "self";
  const rows = await q(
    `select requester_id, status from friendships
     where (requester_id = $1 and addressee_id = $2) or (requester_id = $2 and addressee_id = $1)`,
    [me, other]
  );
  if (!rows.length) return "none";
  if (rows[0].status === "accepted") return "friends";
  return rows[0].requester_id === me ? "outgoing" : "incoming";
}

// Relation to every other member, keyed by their id. Members not in the map: "none".
export async function relationMap(me: number): Promise<Map<number, Relation>> {
  const rows = await q(
    `select requester_id, addressee_id, status from friendships
     where requester_id = $1 or addressee_id = $1`,
    [me]
  );
  const map = new Map<number, Relation>();
  for (const r of rows) {
    const other = r.requester_id === me ? r.addressee_id : r.requester_id;
    map.set(
      other,
      r.status === "accepted" ? "friends" : r.requester_id === me ? "outgoing" : "incoming"
    );
  }
  return map;
}

export async function incomingCount(me: number): Promise<number> {
  const [{ n }] = await q(
    "select count(*)::int as n from friendships where addressee_id = $1 and status = 'pending'",
    [me]
  );
  return n;
}

export async function request(me: number, other: number) {
  if (me === other) return;
  const rel = await relation(me, other);
  if (rel === "incoming") return accept(me, other);
  if (rel !== "none") return;
  const exists = await q("select 1 from users where id = $1", [other]);
  if (!exists.length) return;
  await q(
    "insert into friendships (requester_id, addressee_id) values ($1,$2) on conflict do nothing",
    [me, other]
  );
}

export async function accept(me: number, requester: number) {
  await q(
    `update friendships set status = 'accepted', accepted_at = now()
     where requester_id = $1 and addressee_id = $2 and status = 'pending'`,
    [requester, me]
  );
}

// Decline an incoming request, cancel an outgoing one, or unfriend.
export async function remove(me: number, other: number) {
  await q(
    `delete from friendships
     where (requester_id = $1 and addressee_id = $2) or (requester_id = $2 and addressee_id = $1)`,
    [me, other]
  );
}
