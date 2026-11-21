import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { getUser } from "@/lib/auth";
import { Stamp } from "@/app/stamp";

export const metadata = { title: `Ask nicely · ${APP_NAME}` };

const ERRORS: Record<string, string> = {
  missing: "We need an email.",
  email: "That doesn't look like an email.",
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
        <Stamp width={170} label={APP_NAME} />
        <h2 className="gate-head">Noted.</h2>
        <p className="gate-line">Every request gets read by a human. If someone vouches, you&apos;ll hear from us. Act normal.</p>
        <p className="door-foot">
          <Link href="/">Back to the door</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="gate">
      <Stamp width={170} label={APP_NAME} />
      <h2 className="gate-head">Ask nicely</h2>
      <p className="gate-line">Members only. Tell us who sent you.</p>
      {error && ERRORS[error] && <p className="error">{ERRORS[error]}</p>}
      <form method="post" action="/api/request-invite" className="stack gate-form">
        <label className="sr-only" htmlFor="rq-email">Email</label>
        <input id="rq-email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
        <label className="sr-only" htmlFor="rq-note">Who sent you</label>
        <input id="rq-note" name="note" placeholder="Who sent you?" />
        {/* Left empty by people; bots tend to fill it. */}
        <input name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />
        <button className="btn btn-hot" type="submit">
          Put me on the list
        </button>
      </form>
      <p className="door-foot">
        <Link href="/signin">Already on the list?</Link>
      </p>
    </div>
  );
}
