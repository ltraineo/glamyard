import Link from "next/link";
import { notFound } from "next/navigation";
import { q } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { circleFirst } from "@/lib/circle";
import { relationMap } from "@/lib/friends";
import { dateRange } from "@/lib/format";
import { CheckinButton, FriendButton, PersonRow } from "@/app/ui";
import { PhotoUploader } from "@/app/photo-uploader";

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ removed?: string }>;
}) {
  const me = await requireUser();
  const { slug } = await params;
  const { removed } = await searchParams;
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
  const photos = await q(
    `select p.id, p.caption, p.user_id, u.name as poster_name
     from photos p left join users u on u.id = p.user_id
     where p.event_id = $1 order by p.created_at desc`,
    [event.id]
  );

  return (
    <>
      <p className="crumb">
        <Link href="/events">← Back</Link>
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
                Official site ↗
              </a>
            </p>
          )}
        </div>
        <CheckinButton eventId={event.id} going={going} next={here} />
      </div>

      <h2 className="month" id="photos">
        Photos{photos.length ? ` · ${photos.length}` : ""}
      </h2>
      {removed && <p className="ok small">Photo removed.</p>}
      {photos.length === 0 && (
        <p className="muted small">
          {going ? "No photos yet. Start the evidence file." : "No photos yet."}
        </p>
      )}
      {photos.length > 0 && (
        <div className="photo-grid">
          {photos.map((ph) => (
            <div key={ph.id} className="photo-cell">
              <Link href={`/photos/${ph.id}`} className="photo-tile" aria-label={ph.caption || `Photo by ${ph.poster_name}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/photos/${ph.id}/thumb`} alt="" loading="lazy" width={240} height={240} />
              </Link>
              {(ph.user_id === me.id || me.is_admin) && (
                <Link href={`/photos/${ph.id}?confirm=delete`} className="photo-x" aria-label="Delete photo" title="Delete photo">
                  ✕
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
      {going ? (
        <PhotoUploader eventId={event.id} />
      ) : (
        <p className="muted small">Mark yourself as going to post photos.</p>
      )}

      <h2 className="month">
        {people.length === 0
          ? "Quiet so far"
          : `${people.length} going${friendCount ? ` · ${friendCount} ${friendCount === 1 ? "friend" : "friends"}` : ""}`}
      </h2>
      {people.length === 0 ? (
        <p className="muted">Nobody&apos;s here yet. Suspicious. Be first.</p>
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
