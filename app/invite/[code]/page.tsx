import { redirect } from "next/navigation";
import { APP_NAME, placeholderEnabled } from "@/lib/config";
import { getUser } from "@/lib/auth";
import { findInvite } from "@/lib/members";
import { Avatar } from "@/app/ui";
import { SIGNIN_ERRORS, SignInOptions } from "@/app/signin-options";
import { Stamp } from "@/app/stamp";

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
        <Stamp width={170} label={APP_NAME} />
        <h2 className="gate-head">{invite ? "Already used" : "Wrong door"}</h2>
        <p className="gate-line">
          {invite ? "Someone already walked in on this invite." : "This invite link isn't valid."} Ask whoever sent
          it for a fresh one.
        </p>
      </div>
    );
  }

  return (
    <div className="gate">
      <Stamp width={170} label={APP_NAME} />
      <h2 className="gate-head">You&apos;re on the list</h2>
      <div className="vouch">
        <Avatar name={invite.inviter_name} src={invite.inviter_avatar} size={48} />
        <p>
          <strong>{invite.inviter_name}</strong> invited you.
          {invite.inviter_headline && <span className="muted"> {invite.inviter_headline}</span>}
        </p>
      </div>
      <p className="gate-line">See who&apos;s in town, where the dinners are, and who&apos;s still out. Don&apos;t tell anyone.</p>
      {error && SIGNIN_ERRORS[error] && <p className="error">{SIGNIN_ERRORS[error]}</p>}
      {!placeholderEnabled ? (
        <SignInOptions invite={code} />
      ) : (
        <form method="post" action="/api/join" className="stack gate-form">
          <input type="hidden" name="code" value={code} />
          <input name="name" placeholder="Full name" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="headline" placeholder="Headline, e.g. VP Events at Acme" />
          <button className="btn" type="submit">
            Walk in
          </button>
        </form>
      )}
    </div>
  );
}
