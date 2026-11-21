import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { Stamp } from "@/app/stamp";

export default async function CheckEmail({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  return (
    <div className="gate">
      <Stamp width={170} label={APP_NAME} />
      <h2 className="gate-head">Check your inbox</h2>
      <p className="gate-line">
        If {to ? <strong>{to}</strong> : "that email"} is on the list, a link is on its way. It works once and
        expires in 30 minutes.
      </p>
      <p className="door-foot">
        Nothing yet? Check spam, or <Link href="/signin">try again</Link>.
      </p>
    </div>
  );
}
