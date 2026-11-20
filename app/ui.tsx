import Link from "next/link";
import { initials } from "@/lib/format";
import type { Relation } from "@/lib/friends";

export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" src={src} alt="" style={style} />;
  }
  return (
    <span className="avatar" style={style} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function FriendButton({
  id,
  rel,
  next,
  compact,
}: {
  id: number;
  rel: Relation;
  next: string;
  compact?: boolean;
}) {
  if (rel === "self" || rel === "friends") return null;
  const cls = compact ? "btn btn-small" : "btn";
  if (rel === "outgoing") {
    return (
      <form method="post" action="/api/unfriend">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="next" value={next} />
        <button className={`${cls} btn-quiet`} type="submit" title="Cancel request">
          Requested
        </button>
      </form>
    );
  }
  return (
    <form method="post" action={rel === "incoming" ? "/api/accept" : "/api/friend"}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="next" value={next} />
      <button className={cls} type="submit">
        {rel === "incoming" ? "Accept request" : "Add friend"}
      </button>
    </form>
  );
}

export function PersonRow({
  person,
  tag,
  action,
}: {
  person: { id: number; name: string; headline: string; avatar_url?: string | null };
  tag?: string;
  action?: React.ReactNode;
}) {
  return (
    <li className="person">
      <Avatar name={person.name} src={person.avatar_url} />
      <div className="person-text">
        <Link href={`/people/${person.id}`} className="person-name">
          {person.name}
        </Link>
        {person.headline && <div className="muted">{person.headline}</div>}
      </div>
      {tag && <span className="tag">{tag}</span>}
      {action}
    </li>
  );
}

export function CheckinButton({
  eventId,
  going,
  next,
}: {
  eventId: number;
  going: boolean;
  next: string;
}) {
  return (
    <form method="post" action="/api/checkin">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="next" value={next} />
      <button className={going ? "btn btn-on" : "btn"} type="submit">
        {going ? "Going ✓" : "I'm going"}
      </button>
    </form>
  );
}
