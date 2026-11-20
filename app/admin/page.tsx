import Link from "next/link";
import { redirect } from "next/navigation";
import { q } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ unsent?: string }>;
}) {
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
  const suggestions = await q(
    `select s.id, s.url, s.name, s.start_date, s.end_date, s.city, u.name as by_name
     from suggestions s left join users u on u.id = s.suggested_by
     where s.status = 'pending' order by s.created_at`
  );
  const requests = await q(
    "select id, name, email, company, note, created_at from invite_requests where status = 'pending' order by created_at"
  );
  const unsentId = (await searchParams).unsent;
  const [unsent] = unsentId
    ? await q("select name, email, invite_code from invite_requests where id = $1", [parseInt(unsentId, 10) || 0])
    : [];
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

      <h2 className="month" id="requests">
        Invite requests ({requests.length})
      </h2>
      {unsent && (
        <p className="error">
          The invite email to {unsent.email} didn&apos;t send. Send {unsent.name} this link yourself: /invite/
          {unsent.invite_code}
        </p>
      )}
      {requests.length === 0 ? (
        <p className="muted">Nothing waiting.</p>
      ) : (
        <ul className="people">
          {requests.map((r) => (
            <li key={r.id} className="person">
              <div className="person-text">
                <strong>{r.name}</strong> <span className="muted small">{r.email}</span>
                {r.company && <div className="muted">{r.company}</div>}
                {r.note && <div className="small">Knows: {r.note}</div>}
              </div>
              <div className="row-actions">
                <form method="post" action="/api/approve-request">
                  <input type="hidden" name="id" value={r.id} />
                  <button className="btn btn-small btn-on" type="submit">
                    Send invite
                  </button>
                </form>
                <form method="post" action="/api/dismiss-request">
                  <input type="hidden" name="id" value={r.id} />
                  <button className="link muted small" type="submit">
                    Dismiss
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="month" id="suggestions">
        Suggested events ({suggestions.length})
      </h2>
      {suggestions.length === 0 ? (
        <p className="muted">Nothing waiting.</p>
      ) : (
        suggestions.map((s) => (
          <div key={s.id} id={`s${s.id}`} className="suggestion">
            <p className="muted small">
              From {s.by_name || "a former member"} ·{" "}
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.url} ↗
              </a>
              {!s.name && " · Couldn't read the page, fill in the details"}
            </p>
            <form method="post" action="/api/approve" className="suggest-grid">
              <input type="hidden" name="id" value={s.id} />
              <label>
                Name
                <input name="name" defaultValue={s.name} required />
              </label>
              <label>
                City
                <input name="city" defaultValue={s.city} />
              </label>
              <label>
                Starts
                <input name="start_date" type="date" defaultValue={s.start_date || ""} />
              </label>
              <label>
                Ends
                <input name="end_date" type="date" defaultValue={s.end_date || ""} />
              </label>
              <label className="wide">
                Website
                <input name="url" defaultValue={s.url} />
              </label>
              <div className="wide row">
                <button className="btn btn-small btn-on" type="submit">
                  Approve and add
                </button>
                <button className="link danger" type="submit" formAction="/api/dismiss" formNoValidate>
                  Dismiss
                </button>
              </div>
            </form>
          </div>
        ))
      )}

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
