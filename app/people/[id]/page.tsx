import Link from "next/link";
import { notFound } from "next/navigation";
import { q } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dateRange } from "@/lib/format";
import { Avatar, PersonRow } from "@/app/ui";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const pid = parseInt(id, 10);
  if (!Number.isFinite(pid)) notFound();

  const [person] = await q(
    `select u.id, u.name, u.headline, u.avatar_url, u.invited_by, v.name as voucher_name
     from users u left join users v on v.id = u.invited_by where u.id = $1`,
    [pid]
  );
  if (!person) notFound();

  const events = await q(
    `select e.slug, e.name, e.start_date, e.end_date, e.city,
            exists (select 1 from checkins c2 where c2.event_id = e.id and c2.user_id = $2) as me_too
     from checkins c join events e on e.id = c.event_id
     where c.user_id = $1 order by e.start_date nulls last`,
    [pid, me.id]
  );
  const invited = await q(
    "select id, name, headline, avatar_url from users where invited_by = $1 order by created_at",
    [pid]
  );
  const mine = me.id === pid;

  return (
    <>
      <div className="profile">
        <Avatar name={person.name} src={person.avatar_url} size={72} />
        <div>
          <h1>{person.name}</h1>
          {person.headline && <p className="lede">{person.headline}</p>}
          <p className="muted">
            {person.invited_by ? (
              <>
                Vouched for by <Link href={`/people/${person.invited_by}`}>{person.voucher_name}</Link>
              </>
            ) : (
              "Founding member"
            )}
          </p>
        </div>
      </div>

      {mine && (
        <form method="post" action="/api/headline" className="inline-form">
          <input name="headline" defaultValue={person.headline} placeholder="Your headline" maxLength={140} />
          <button className="btn btn-small" type="submit">
            Save headline
          </button>
        </form>
      )}

      <h2 className="month">{mine ? "Where you'll be" : "Where they'll be"}</h2>
      {events.length === 0 ? (
        <p className="muted">
          {mine ? (
            <>
              Nothing yet. <Link href="/events">Pick your events.</Link>
            </>
          ) : (
            "No events marked yet."
          )}
        </p>
      ) : (
        <ul className="plain">
          {events.map((e) => (
            <li key={e.slug}>
              <Link href={`/events/${e.slug}`} className="event-name">
                {e.name}
              </Link>
              <span className="muted">
                {" "}
                · {dateRange(e.start_date, e.end_date)} · {e.city}
              </span>
              {!mine && e.me_too && <span className="tag">You too</span>}
            </li>
          ))}
        </ul>
      )}

      {invited.length > 0 && (
        <>
          <h2 className="month">Invited by {mine ? "you" : person.name.split(" ")[0]}</h2>
          <ul className="people">
            {invited.map((p) => (
              <PersonRow key={p.id} person={p as any} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}
