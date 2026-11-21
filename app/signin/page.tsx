import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { getUser } from "@/lib/auth";
import { SIGNIN_ERRORS, SignInOptions } from "@/app/signin-options";
import { Stamp } from "@/app/stamp";

export const metadata = { title: `Sign in · ${APP_NAME}` };

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getUser()) redirect("/events");
  const { error } = await searchParams;

  return (
    <div className="gate">
      <Stamp width={170} label={APP_NAME} />
      <h2 className="gate-head">On the list?</h2>
      <p className="gate-line">Prove it.</p>
      {error && SIGNIN_ERRORS[error] && <p className="error">{SIGNIN_ERRORS[error]}</p>}
      <SignInOptions />
      <p className="door-foot">
        <Link href="/request">Not yet? Ask nicely</Link> · <Link href="/privacy">Privacy</Link>
      </p>
    </div>
  );
}
