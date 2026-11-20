import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { getUser } from "@/lib/auth";
import { SIGNIN_ERRORS, SignInOptions } from "@/app/signin-options";

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
      <h1 className="gate-name">{APP_NAME}</h1>
      <p className="gate-line">Member sign in</p>
      {error && SIGNIN_ERRORS[error] && <p className="error">{SIGNIN_ERRORS[error]}</p>}
      <SignInOptions />
      <p className="footer-links">
        <Link className="muted" href="/privacy">
          Privacy
        </Link>
      </p>
    </div>
  );
}
