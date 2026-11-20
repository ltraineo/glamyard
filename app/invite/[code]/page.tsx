import { redirect } from "next/navigation";
import { APP_NAME, linkedinEnabled } from "@/lib/config";
import { getUser } from "@/lib/auth";
import { findInvite } from "@/lib/members";
import { Avatar } from "@/app/ui";

const ERRORS: Record<string, string> = {
  missing: "Name and email are required.",
  exists: "That email already belongs to a member. Sign in instead.",
  used: "This invite has already been used.",
  invalid: "This invite link isn't valid.",
};

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getUser()) redirect("/events");
  const { code } = await params;
  const { error } = await searchParams;
  const invite = await findInvite(code);

  if (!invite || invite.used_by) {
    return (
      <div className="gate">
        <h1 className="gate-name">{APP_NAME}</h1>
        <p className="gate-line">
          {invite ? "This invite has already been used." : "This invite link isn't valid."}
        </p>
        <p className="muted">Ask the person who sent it for a fresh one.</p>
      </div>
    );
  }

  return (
    <div className="gate">
      <h1 className="gate-name">{APP_NAME}</h1>
      <div className="vouch">
        <Avatar name={invite.inviter_name} size={48} />
        <p>
          <strong>{invite.inviter_name}</strong> invited you.
          {invite.inviter_headline && <span className="muted"> {invite.inviter_headline}</span>}
        </p>
      </div>
      <p className="gate-line">
        A private list of who&apos;s going to which industry events. Members only.
      </p>
      {error && ERRORS[error] && <p className="error">{ERRORS[error]}</p>}
      {linkedinEnabled ? (
        <a className="btn" href={`/auth/linkedin?invite=${encodeURIComponent(code)}`}>
          Accept with LinkedIn
        </a>
      ) : (
        <form method="post" action="/api/join" className="stack gate-form">
          <input type="hidden" name="code" value={code} />
          <input name="name" placeholder="Full name" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="headline" placeholder="Headline, e.g. VP Events at Acme" />
          <button className="btn" type="submit">
            Accept invite
          </button>
        </form>
      )}
    </div>
  );
}
