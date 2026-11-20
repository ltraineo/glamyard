import { redirect } from "next/navigation";
import { APP_NAME, placeholderEnabled } from "@/lib/config";
import { getUser } from "@/lib/auth";
import { memberCount } from "@/lib/members";
import { SIGNIN_ERRORS, SignInOptions } from "@/app/signin-options";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getUser()) redirect("/events");
  if (placeholderEnabled && (await memberCount()) === 0) redirect("/setup");
  const { error } = await searchParams;

  return (
    <div className="gate">
      <h1 className="gate-name">{APP_NAME}</h1>
      <p className="gate-line">Invite only. Members sign in below.</p>
      {error && SIGNIN_ERRORS[error] && <p className="error">{SIGNIN_ERRORS[error]}</p>}
      <SignInOptions />
    </div>
  );
}
