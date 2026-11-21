import Link from "next/link";
import { notFound } from "next/navigation";
import { q } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { relation } from "@/lib/friends";
import { dateRange } from "@/lib/format";
import { linkedinEnabled } from "@/lib/config";
import { Avatar, FriendButton, PersonRow } from "@/app/ui";

const PROFILE_ERRORS: Record<string, string> = {
  linkedin: "LinkedIn didn't connect. Please try again.",
  "linkedin-taken": "That LinkedIn account is already connected to another member.",
  "linkedin-url": "Use your LinkedIn profile link, like linkedin.com/in/yourname.",
};

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await requireUser();
  const { id } = await params;
  const { error } = await searchParams;
  const pid = parseInt(id, 10);
  if (!Number.isFinite(pid)) notFound();

  const [person] = await q(
    `select u.id, u.name, u.headline, u.avatar_url, u.invited_by, v.name as voucher_name,
            u.linkedin_url, (u.linkedin_sub is not null) as li_connected
     from users u left join users v on v.id = u.invited_by where u.id = $1`,
    [pid]
  );
  if (!person) notFound();

  const rel = await relation(me.id, pid);
  const mine = rel === "self";
  // A member's full schedule is visible only to them and their friends.
  const canSee = mine || rel === "friends";

  const events = canSee
    ? await q(
        `select e.slug, e.name, e.start_date, e.end_date, e.city,
                exists (select 1 from checkins c2 where c2.event_id = e.id and c2.user_id = $2) as me_too
         from checkins c join events e on e.id = c.event_id
         where c.user_id = $1 order by e.start_date nulls last`,
        [pid, me.id]
      )
    : [];
  const invited = await q(
    "select id, name, headline, avatar_url from users where invited_by = $1 order by created_at",
    [pid]
  );
  const first = person.name.split(" ")[0];
  const here = `/people/${pid}`;
  // Photos someone is tagged in follow the same rule as their schedule: friends only.
  const tagged = canSee
    ? await q(
        `select p.id, p.caption, e.name as event_name
         from photo_tags t join photos p on p.id = t.photo_id join events e on e.id = p.event_id
         where t.user_id = $1 and t.status = 'approved' order by p.created_at desc limit 60`,
        [pid]
      )
    : [];

  return (
    <>
      <div className="profile">
        <Avatar name={person.name} src={person.avatar_url} size={72} />
        <div className="profile-text">
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
            {rel === "friends" && " · Friends"}
            {person.linkedin_url && (
              <>
                {" · "}
                <a href={person.linkedin_url} target="_blank" rel="noreferrer">
                  LinkedIn ↗
                </a>
              </>
            )}
          </p>
        </div>
        <FriendButton id={pid} rel={rel} next={here} />
      </div>

      {error && PROFILE_ERRORS[error] && <p className="error">{PROFILE_ERRORS[error]}</p>}

      {mine && (
        <section className="edit-profile">
          <form method="post" action="/api/headline" className="suggest-grid">
            <label>
              Headline
              <input name="headline" defaultValue={person.headline} placeholder="VP Events at Acme" maxLength={140} />
            </label>
            <label>
              LinkedIn profile link
              <input name="linkedin_url" defaultValue={person.linkedin_url || ""} placeholder="linkedin.com/in/yourname" inputMode="url" />
            </label>
            <div className="wide row">
              <button className="btn btn-small" type="submit">
                Save profile
              </button>
              {linkedinEnabled &&
                (person.li_connected ? (
                  <span className="muted small">
                    LinkedIn connected.{" "}
                    <button className="link muted small" type="submit" formAction="/api/disconnect-linkedin">
                      Disconnect
                    </button>
                  </span>
                ) : (
                  <a className="small" href="/auth/linkedin?connect=1">
                    Connect LinkedIn to use your photo
                  </a>
                ))}
            </div>
          </form>
        </section>
      )}

      <h2 className="month">{mine ? "Where you'll be" : `Where ${first}'ll be`}</h2>
      {!canSee ? (
        <p className="muted">
          {rel === "incoming"
            ? `${first} sent you a friend request. Accept it to see each other's schedules.`
            : rel === "outgoing"
              ? `Request sent. Once ${first} accepts, you'll see each other's schedules.`
              : `Only friends see ${first}'s schedule. You'll still see ${first} on the attendee list of any event you open.`}
        </p>
      ) : events.length === 0 ? (
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

      {tagged.length > 0 && (
        <>
          <h2 className="month">Photos of {mine ? "you" : first}</h2>
          <div className="photo-grid">
            {tagged.map((ph) => (
              <Link key={ph.id} href={`/photos/${ph.id}`} className="photo-tile" aria-label={ph.caption || `Photo at ${ph.event_name}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/photos/${ph.id}/thumb`} alt="" loading="lazy" width={240} height={240} />
              </Link>
            ))}
          </div>
        </>
      )}

      {invited.length > 0 && (
        <>
          <h2 className="month">Invited by {mine ? "you" : first}</h2>
          <ul className="people">
            {invited.map((p) => (
              <PersonRow key={p.id} person={p as any} />
            ))}
          </ul>
        </>
      )}

      {rel === "friends" && (
        <form method="post" action="/api/unfriend" className="unfriend">
          <input type="hidden" name="id" value={pid} />
          <input type="hidden" name="next" value={here} />
          <button className="link muted small" type="submit">
            Remove friend
          </button>
        </form>
      )}
    </>
  );
}
