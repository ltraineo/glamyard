import type { Relation } from "./friends";

// Ordering for attendee lists: you, then friends, then your invite chain
// (who invited you, who you invited, others invited by the same person), then everyone else.
export function circleTag(
  me: { id: number; invited_by: number | null },
  person: { id: number; invited_by: number | null },
  rels?: Map<number, Relation>
): string | null {
  if (person.id === me.id) return "You";
  if (rels?.get(person.id) === "friends") return "Friend";
  if (me.invited_by !== null && person.id === me.invited_by) return "Invited you";
  if (person.invited_by === me.id) return "You invited";
  if (person.invited_by !== null && person.invited_by === me.invited_by) return "Same circle";
  return null;
}

export function circleFirst<T extends { id: number; invited_by: number | null }>(
  me: { id: number; invited_by: number | null },
  people: T[],
  rels?: Map<number, Relation>
): (T & { tag: string | null })[] {
  const rank = (tag: string | null) =>
    tag === "You" ? 0 : tag === "Friend" ? 1 : tag ? 2 : 3;
  return people
    .map((p) => ({ ...p, tag: circleTag(me, p, rels) }))
    .sort((a, b) => rank(a.tag) - rank(b.tag));
}
