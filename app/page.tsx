import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME, placeholderEnabled } from "@/lib/config";
import { getUser } from "@/lib/auth";
import { memberCount } from "@/lib/members";

// The public front door: deliberately bare. Sign-in lives at /signin, and new
// members arrive through invite links, which carry their own sign-up options.
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
    <div className="gate">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="gate-logo" src="/logo.png" alt="" width={109} height={220} />
      <h1 className="gate-name">{APP_NAME}</h1>
      <p className="gate-tagline">Who do I know at this event?</p>
      <p className="muted small">Invite only.</p>
      <p className="footer-links">
        <Link href="/request">Request an invite</Link>
        <span className="muted"> · </span>
        <Link className="muted" href="/signin">
          Member sign in
        </Link>
      </p>
    </div>
  );
}
