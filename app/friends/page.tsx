import { q } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PersonRow } from "@/app/ui";

export default async function Friends() {
  const me = await requireUser();
  const rows = await q(
    `select f.status, f.requester_id, u.id, u.name, u.headline, u.avatar_url
     from friendships f
     join users u on u.id = case when f.requester_id = $1 then f.addressee_id else f.requester_id end
     where f.requester_id = $1 or f.addressee_id = $1
     order by u.name`,
    [me.id]
  );
  const incoming = rows.filter((r) => r.status === "pending" && r.requester_id !== me.id);
  const outgoing = rows.filter((r) => r.status === "pending" && r.requester_id === me.id);
  const friends = rows.filter((r) => r.status === "accepted");

  const form = (action: string, id: number, label: string, cls: string) => (
    <form method="post" action={`/api/${action}`}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="next" value="/friends" />
      <button className={cls} type="submit">
        {label}
      </button>
    </form>
  );

  return (
    <>
      <h1>Your people</h1>
      <p className="lede">
        Friends see each other&apos;s full schedule and show up first on every list. Add people from
        any event or profile.
      </p>

      {incoming.length > 0 && (
        <>
          <h2 className="month">Wants in ({incoming.length})</h2>
          <ul className="people">
            {incoming.map((p) => (
              <PersonRow
                key={p.id}
                person={p as any}
                action={
                  <div className="row-actions">
                    {form("accept", p.id, "Accept", "btn btn-small btn-on")}
                    {form("unfriend", p.id, "Pass", "link muted small")}
                  </div>
                }
              />
            ))}
          </ul>
        </>
      )}

      <h2 className="month">Friends ({friends.length})</h2>
      {friends.length === 0 ? (
        <p className="muted">Nobody yet. Open an event and add the people you know.</p>
      ) : (
        <ul className="people">
          {friends.map((p) => (
            <PersonRow key={p.id} person={p as any} />
          ))}
        </ul>
      )}

      {outgoing.length > 0 && (
        <>
          <h2 className="month">Waiting on ({outgoing.length})</h2>
          <ul className="people">
            {outgoing.map((p) => (
              <PersonRow
                key={p.id}
                person={p as any}
                action={form("unfriend", p.id, "Cancel", "link muted small")}
              />
            ))}
          </ul>
        </>
      )}
    </>
  );
}
