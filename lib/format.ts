const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function dateRange(start: string | null, end: string | null) {
  if (!start) return "Dates TBA";
  const [, sm, sd] = start.split("-").map(Number);
  const year = start.slice(0, 4);
  if (!end || end === start) return `${MONTHS[sm - 1]} ${sd}, ${year}`;
  const [, em, ed] = end.split("-").map(Number);
  if (sm === em) return `${MONTHS[sm - 1]} ${sd} to ${ed}, ${year}`;
  return `${MONTHS[sm - 1]} ${sd} to ${MONTHS[em - 1]} ${ed}, ${year}`;
}

export function monthLabel(start: string | null) {
  if (!start) return "To be announced";
  const [y, m] = start.split("-").map(Number);
  const full = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${full[m - 1]} ${y}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
