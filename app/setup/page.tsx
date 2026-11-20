import { redirect } from "next/navigation";
import { APP_NAME, linkedinEnabled } from "@/lib/config";
import { memberCount } from "@/lib/members";

export default async function Setup() {
  if (linkedinEnabled || (await memberCount()) > 0) redirect("/");
  return (
    <div className="gate">
      <h1 className="gate-name">{APP_NAME}</h1>
      <p className="gate-line">You&apos;re the first one here. Set up the founder account.</p>
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
