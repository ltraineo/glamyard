import Link from "next/link";
import { APP_NAME } from "@/lib/config";

export default async function CheckEmail({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  return (
    <div className="gate">
      <h1 className="gate-name">{APP_NAME}</h1>
      <p className="gate-line">
        Check your email{to ? <> at <strong>{to}</strong></> : ""}. If it belongs to a member or an
        invite, a link is on its way. It works once and expires in 30 minutes.
      </p>
      <p className="muted small">
        Nothing after a few minutes? Check spam, or <Link href="/">try again</Link>.
      </p>
    </div>
  );
}
