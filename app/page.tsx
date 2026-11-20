import { redirect } from "next/navigation";
import { APP_NAME, linkedinEnabled } from "@/lib/config";
import { getUser } from "@/lib/auth";
import { memberCount } from "@/lib/members";

const ERRORS: Record<string, string> = {
  unknown: "That email isn't on the list.",
  invite: "You need an invite from a member to join.",
  linkedin: "LinkedIn sign-in didn't complete. Please try again.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getUser()) redirect("/events");
  const empty = (await memberCount()) === 0;
  if (empty && !linkedinEnabled) redirect("/setup");
  const { error } = await searchParams;

  return (
    <div className="gate">
      <h1 className="gate-name">{APP_NAME}</h1>
      <p className="gate-line">Invite only.</p>
      {error && ERRORS[error] && <p className="error">{ERRORS[error]}</p>}
      {linkedinEnabled ? (
        <a className="btn" href="/auth/linkedin">
          {empty ? "Set up with LinkedIn" : "Member sign in"}
        </a>
      ) : (
        <form method="post" action="/api/signin" className="stack gate-form">
          <input name="email" type="email" placeholder="Member email" required />
          <button className="btn" type="submit">
            Member sign in
          </button>
          <p className="muted small">Placeholder sign-in for testing. LinkedIn replaces this.</p>
        </form>
      )}
    </div>
  );
}
