import Link from "next/link";
import { headers } from "next/headers";
import { q } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { baseUrl, INVITE_CAP } from "@/lib/config";

export default async function Invites({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await requireUser();
  const { error } = await searchParams;
  const h = await headers();
  const origin = baseUrl(
    `${h.get("x-forwarded-proto") || "http"}://${h.get("x-forwarded-host") || h.get("host")}`
  );

  const invites = await q(
    `select i.code, i.created_at, u.id as used_id, u.name as used_name
     from invites i left join users u on u.id = i.used_by
     where i.inviter_id = $1 order by i.created_at desc`,
    [me.id]
  );
  const open = invites.filter((i) => !i.used_id);
  const accepted = invites.filter((i) => i.used_id);
  const capped = INVITE_CAP !== null && !me.is_admin;

  return (
    <>
      <h1>Invites</h1>
      <p className="lede">
        Each link works once. Your name follows everyone you bring in, so only bring people you&apos;d
        vouch for.
      </p>
      {error === "cap" && <p className="error">You&apos;re out of invites.</p>}
      <form method="post" action="/api/invite">
        <button className="btn" type="submit">
          New invite link
        </button>
        {capped && (
          <span className="muted small">
            {" "}
            {Math.max(0, INVITE_CAP! - invites.length)} of {INVITE_CAP} left
          </span>
        )}
      </form>

      <h2 className="month">Unused ({open.length})</h2>
      {open.length === 0 ? (
        <p className="muted">None out right now.</p>
      ) : (
        <ul className="plain">
          {open.map((i) => (
            <li key={i.code}>
              <input className="copy" readOnly value={`${origin}/invite/${i.code}`} />
            </li>
          ))}
        </ul>
      )}

      <h2 className="month">Walked in ({accepted.length})</h2>
      {accepted.length === 0 ? (
        <p className="muted">Nobody yet.</p>
      ) : (
        <ul className="plain">
          {accepted.map((i) => (
            <li key={i.code}>
              <Link href={`/people/${i.used_id}`}>{i.used_name}</Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
