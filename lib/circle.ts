// "Your circle" is the invite chain: who invited you, who you invited,
// and others invited by the same person. These people are listed first.
export function circleTag(
  me: { id: number; invited_by: number | null },
  person: { id: number; invited_by: number | null }
): string | null {
  if (person.id === me.id) return "You";
  if (me.invited_by !== null && person.id === me.invited_by) return "Invited you";
  if (person.invited_by === me.id) return "You invited";
  if (person.invited_by !== null && person.invited_by === me.invited_by) return "Same circle";
  return null;
}

export function circleFirst<T extends { id: number; invited_by: number | null }>(
  me: { id: number; invited_by: number | null },
  people: T[]
): (T & { tag: string | null })[] {
  const rank = (tag: string | null) => (tag === "You" ? 0 : tag ? 1 : 2);
  return people
    .map((p) => ({ ...p, tag: circleTag(me, p) }))
    .sort((a, b) => rank(a.tag) - rank(b.tag));
}
