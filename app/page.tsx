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
      <h1 className="gate-name">{APP_NAME}</h1>
      <p className="gate-line">Invite only.</p>
      <p className="footer-links">
        <Link className="muted" href="/signin">
          Member sign in
        </Link>
      </p>
    </div>
  );
}
