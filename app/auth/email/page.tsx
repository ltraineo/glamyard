import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { peekEmailLink } from "@/lib/signin";

// Email security scanners open links automatically. Signing in takes a tap on
// this page, so a scanner can't use up the link before the person does.
export default async function EmailLink({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const valid = token ? await peekEmailLink(token) : null;

  return (
    <div className="gate">
      <h1 className="gate-name">{APP_NAME}</h1>
      {valid ? (
        <form method="post" action="/api/email-confirm" className="stack gate-form">
          <input type="hidden" name="token" value={token} />
          <p className="gate-line">Signing in as {valid.email}</p>
          <button className="btn" type="submit">
            Continue
          </button>
        </form>
      ) : (
        <>
          <p className="gate-line">This link has expired or was already used.</p>
          <Link className="btn" href="/">
            Get a new link
          </Link>
        </>
      )}
    </div>
  );
}
