import Link from "next/link";
import { redirect } from "next/navigation";
import { q } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function Admin() {
  const me = await requireUser();
  if (!me.is_admin) redirect("/events");

  const members = await q(
    `select u.id, u.name, u.headline, u.invited_by, v.name as voucher_name,
            (select count(*)::int from checkins c where c.user_id = u.id) as checkins,
            (select count(*)::int from users k where k.invited_by = u.id) as brought_in
     from users u left join users v on v.id = u.invited_by
     order by u.created_at`
  );
  const [stats] = await q(
    `select (select count(*)::int from invites) as sent,
            (select count(*)::int from invites where used_by is not null) as accepted,
            (select count(*)::int from checkins) as checkins`
  );
  const active = members.filter((m) => m.checkins > 0).length;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "n/a");

  return (
    <>
      <h1>Admin</h1>
      <div className="stats">
        <div>
          <strong>{members.length}</strong>
          <span>members</span>
        </div>
        <div>
          <strong>{pct(active, members.length)}</strong>
          <span>have checked in</span>
        </div>
        <div>
          <strong>{stats.checkins}</strong>
          <span>check-ins</span>
        </div>
        <div>
          <strong>
            {stats.accepted}/{stats.sent}
          </strong>
          <span>invites accepted ({pct(stats.accepted, stats.sent)})</span>
        </div>
      </div>

      <h2 className="month">Members</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Vouched for by</th>
            <th>Events</th>
            <th>Brought in</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>
                <Link href={`/people/${m.id}`}>{m.name}</Link>
                {m.headline && <div className="muted small">{m.headline}</div>}
              </td>
              <td>
                {m.invited_by ? <Link href={`/people/${m.invited_by}`}>{m.voucher_name}</Link> : "Founder"}
              </td>
              <td>{m.checkins}</td>
              <td>{m.brought_in}</td>
              <td className="actions">
                {m.id !== me.id && (
                  <>
                    <form method="post" action="/api/remove">
                      <input type="hidden" name="id" value={m.id} />
                      <button className="link danger" type="submit">
                        Remove
                      </button>
                    </form>
                    {m.brought_in > 0 && (
                      <form method="post" action="/api/remove">
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="mode" value="branch" />
                        <button className="link danger" type="submit">
                          Remove with invitees
                        </button>
                      </form>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
