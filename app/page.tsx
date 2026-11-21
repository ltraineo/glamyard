import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME, placeholderEnabled } from "@/lib/config";
import { getUser } from "@/lib/auth";
import { memberCount } from "@/lib/members";
import { SignInOptions } from "@/app/signin-options";
import { Stamp } from "@/app/stamp";

// The front door: deliberately bare. One way in for strangers (ask nicely),
// and a barely-there link for people already on the list.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getUser()) redirect("/events");
  if (placeholderEnabled && (await memberCount()) === 0) redirect("/setup");
  const { error } = await searchParams;
  if (error) redirect(`/signin?error=${encodeURIComponent(error)}`);

  return (
    <div className="gate door">
      <h1 className="sr-only">{APP_NAME}</h1>
      <Stamp width={250} label={APP_NAME} />
      <p className="door-line">
        Who do I know
        <br />
        at this event??
      </p>
      <Link className="btn btn-hot" href="/request">
        Ask nicely
      </Link>
      <details className="on-list">
        <summary>I&apos;m on the list</summary>
        <SignInOptions />
      </details>
      <p className="door-foot">Invite only · <Link href="/privacy">Privacy</Link></p>
    </div>
  );
}
