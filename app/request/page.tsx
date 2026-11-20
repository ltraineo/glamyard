import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { getUser } from "@/lib/auth";

export const metadata = { title: `Request an invite · ${APP_NAME}` };

const ERRORS: Record<string, string> = {
  missing: "Please add your name and email.",
  email: "That doesn't look like an email address.",
};

export default async function RequestInvite({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  if (await getUser()) redirect("/events");
  const { error, sent } = await searchParams;

  if (sent) {
    return (
      <div className="gate">
        <h1 className="gate-name">{APP_NAME}</h1>
        <p className="gate-line">
          Thanks. Requests are reviewed by hand. If it&apos;s a fit, your invite will arrive by email.
        </p>
        <p className="footer-links">
          <Link className="muted" href="/">
            Back
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="gate">
      <h1 className="gate-name">{APP_NAME}</h1>
      <p className="gate-line">A private list of who&apos;s going to which industry events. Request an invite.</p>
      {error && ERRORS[error] && <p className="error">{ERRORS[error]}</p>}
      <form method="post" action="/api/request-invite" className="stack gate-form">
        <label className="sr-only" htmlFor="rq-name">Full name</label>
        <input id="rq-name" name="name" placeholder="Full name" autoComplete="name" required />
        <label className="sr-only" htmlFor="rq-email">Email</label>
        <input id="rq-email" name="email" type="email" placeholder="Email" autoComplete="email" required />
        <label className="sr-only" htmlFor="rq-company">Role and company</label>
        <input id="rq-company" name="company" placeholder="Role and company, e.g. VP Events at Acme" />
        <label className="sr-only" htmlFor="rq-note">Who you know here</label>
        <input id="rq-note" name="note" placeholder="Anyone here who can vouch for you? (optional)" />
        {/* Left empty by people; bots tend to fill it. */}
        <input name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />
        <button className="btn" type="submit">
          Request an invite
        </button>
      </form>
      <p className="footer-links">
        <Link className="muted" href="/signin">
          Already a member? Sign in
        </Link>
      </p>
    </div>
  );
}
