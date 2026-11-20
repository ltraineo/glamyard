import Link from "next/link";
import { APP_NAME } from "@/lib/config";

export const metadata = { title: `Privacy · ${APP_NAME}` };

const CONTACT = "ltrain@gmail.com";

export default function Privacy() {
  return (
    <article className="prose">
      <p className="crumb">
        <Link href="/">← {APP_NAME}</Link>
      </p>
      <h1>Privacy</h1>
      <p className="muted">Last updated November 19, 2026</p>

      <p>
        {APP_NAME} is a private, invite-only list of who is going to which industry events. It is
        run by Lawrence Coburn. This page explains what we collect and what we do with it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your name and email address, and your profile photo if you
          sign in with Google or connect LinkedIn.
        </li>
        <li>
          <strong>What you add:</strong> your headline, an optional LinkedIn profile link, the events
          you mark as attending, events you suggest, your friends and friend requests, and the
          invites you create.
        </li>
        <li>
          <strong>Who invited you,</strong> which is shown on your profile.
        </li>
      </ul>
      <p>
        When you sign in with Google or LinkedIn we receive only your basic profile: name, email
        address and photo. We never see your password, contacts or connections, and we never post
        on your behalf.
      </p>

      <h2>Who sees it</h2>
      <ul>
        <li>Only members can see anything inside {APP_NAME}. Nothing is public or indexed by search engines.</li>
        <li>Any member can see your name, photo, headline, who invited you, and that you are attending a given event.</li>
        <li>Only your friends can see your full list of events.</li>
      </ul>

      <h2>What we don&apos;t do</h2>
      <p>We don&apos;t sell or rent your information, show ads, or share it with event organizers.</p>

      <h2>Services we use</h2>
      <p>
        {APP_NAME} runs on Vercel (hosting) and Neon (database). Sign-in emails are sent through
        Resend. Google and LinkedIn handle their own sign-in. These providers process data only to
        run those services.
      </p>

      <h2>Your choices</h2>
      <p>
        You can edit your profile and remove event check-ins at any time. To delete your account and
        its data, email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> and it will be removed.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
    </article>
  );
}
