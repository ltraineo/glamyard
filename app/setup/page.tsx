import { redirect } from "next/navigation";
import { APP_NAME, placeholderEnabled } from "@/lib/config";
import { memberCount } from "@/lib/members";
import { Stamp } from "@/app/stamp";

export default async function Setup() {
  if (!placeholderEnabled || (await memberCount()) > 0) redirect("/");
  return (
    <div className="gate">
      <Stamp width={170} label={APP_NAME} />
      <h2 className="gate-head">First one here</h2>
      <p className="gate-line">Set up the founder account.</p>
      <form method="post" action="/api/setup" className="stack gate-form">
        <input name="name" placeholder="Full name" required />
        <input name="email" type="email" placeholder="Email" required />
        <input name="headline" placeholder="Headline, e.g. CEO at Acme" />
        <button className="btn" type="submit">
          Create founder account
        </button>
      </form>
    </div>
  );
}
