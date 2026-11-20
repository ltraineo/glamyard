import Link from "next/link";
import { q } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { circleFirst } from "@/lib/circle";
import { dateRange, monthLabel } from "@/lib/format";
import { Avatar, CheckinButton } from "@/app/ui";

export default async function Events() {
  const me = await requireUser();
  const events = await q(
    "select id, slug, name, start_date, end_date, city, note from events order by start_date nulls last, name"
  );
  const rows = await q(
    `select c.event_id, u.id, u.name, u.avatar_url, u.invited_by
     from checkins c join users u on u.id = c.user_id order by c.created_at`
  );
  const byEvent = new Map<number, any[]>();
  for (const r of rows) {
    if (!byEvent.has(r.event_id)) byEvent.set(r.event_id, []);
    byEvent.get(r.event_id)!.push(r);
  }

  let lastMonth = "";
  return (
    <>
      <h1>Events</h1>
      <p className="lede">Mark where you&apos;ll be. See who else is going.</p>
      {events.map((e) => {
        const people = circleFirst(me, byEvent.get(e.id) || []);
        const going = people.some((p) => p.id === me.id);
        const known = people.filter((p) => p.tag && p.tag !== "You").length;
        const month = monthLabel(e.start_date);
        const heading = month !== lastMonth ? <h2 className="month">{month}</h2> : null;
        lastMonth = month;
        return (
          <div key={e.id}>
            {heading}
            <article className="event">
              <div className="event-main">
                <Link href={`/events/${e.slug}`} className="event-name">
                  {e.name}
                </Link>
                <div className="muted">
                  {dateRange(e.start_date, e.end_date)} · {e.city}
                  {e.note && <span className="note"> · {e.note}</span>}
                </div>
                <div className="faces">
                  {people.slice(0, 6).map((p) => (
                    <Avatar key={p.id} name={p.name} src={p.avatar_url} size={28} />
                  ))}
                  <span className="muted small">
                    {people.length === 0
                      ? "No one yet"
                      : `${people.length} going${known ? ` · ${known} in your circle` : ""}`}
                  </span>
                </div>
              </div>
              <CheckinButton eventId={e.id} going={going} next="/events" />
            </article>
          </div>
        );
      })}
    </>
  );
}
