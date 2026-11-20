import Link from "next/link";
import { notFound } from "next/navigation";
import { q } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { circleFirst } from "@/lib/circle";
import { relationMap } from "@/lib/friends";
import { dateRange } from "@/lib/format";
import { CheckinButton, FriendButton, PersonRow } from "@/app/ui";

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const me = await requireUser();
  const { slug } = await params;
  const [event] = await q("select * from events where slug = $1", [slug]);
  if (!event) notFound();

  const attendees = await q(
    `select u.id, u.name, u.headline, u.avatar_url, u.invited_by
     from checkins c join users u on u.id = c.user_id
     where c.event_id = $1 order by c.created_at`,
    [event.id]
  );
  const rels = await relationMap(me.id);
  const people = circleFirst(me, attendees as any[], rels);
  const going = people.some((p) => p.id === me.id);
  const friendCount = people.filter((p) => p.tag === "Friend").length;
  const here = `/events/${event.slug}`;

  return (
    <>
      <p className="crumb">
        <Link href="/events">← All events</Link>
      </p>
      <div className="event-head">
        <div>
          <h1>{event.name}</h1>
          <p className="lede">
            {dateRange(event.start_date, event.end_date)} · {event.city}
            {event.note && <span className="note"> · {event.note}</span>}
          </p>
          {event.url && (
            <p>
              <a href={event.url} target="_blank" rel="noreferrer">
                Event website ↗
              </a>
            </p>
          )}
        </div>
        <CheckinButton eventId={event.id} going={going} next={here} />
      </div>

      <h2 className="month">
        {people.length === 0
          ? "No one yet"
          : `${people.length} going${friendCount ? ` · ${friendCount} ${friendCount === 1 ? "friend" : "friends"}` : ""}`}
      </h2>
      {people.length === 0 ? (
        <p className="muted">Be the first. Others will see you here.</p>
      ) : (
        <ul className="people">
          {people.map((p) => (
            <PersonRow
              key={p.id}
              person={p as any}
              tag={p.tag || undefined}
              action={<FriendButton id={p.id} rel={rels.get(p.id) || (p.id === me.id ? "self" : "none")} next={here} compact />}
            />
          ))}
        </ul>
      )}
    </>
  );
}
