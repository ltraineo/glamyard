import { emailEnabled, googleEnabled, linkedinEnabled, placeholderEnabled } from "@/lib/config";

export const SIGNIN_ERRORS: Record<string, string> = {
  unknown: "That email isn't on the list. Yet.",
  invite: "You need an invite from a member to join.",
  "linkedin-new": "LinkedIn sign-in is for members who already connected it. Use Google or email.",
  linkedin: "LinkedIn sign-in didn't complete. Please try again.",
  google: "Google sign-in didn't complete. Please try again.",
  unverified: "That account's email isn't verified. Try the email link instead.",
  email: "That doesn't look like an email address.",
  send: "We couldn't send the email. Please try again in a minute.",
  expired: "That link has expired or was already used. Request a new one.",
  missing: "Please add your name.",
  exists: "That email already belongs to a member. Sign in instead.",
  used: "This invite has already been used.",
  invalid: "This invite link isn't valid.",
};

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.4 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

// The sign-in choices. With `invite`, they join with that invite; for email,
// a new member also gives their name.
export function SignInOptions({ invite }: { invite?: string }) {
  const joining = !!invite;
  return (
    <div className="stack gate-form">
      {googleEnabled && (
        <a className="btn btn-google" href={`/auth/google${invite ? `?invite=${encodeURIComponent(invite)}` : ""}`}>
          <GoogleIcon /> Continue with Google
        </a>
      )}
      {googleEnabled && emailEnabled && <p className="or">or</p>}
      {emailEnabled && (
        <form method="post" action="/api/email-link" className="stack">
          {invite && <input type="hidden" name="code" value={invite} />}
          {joining && (
            <>
              <label className="sr-only" htmlFor="si-name">Full name</label>
              <input id="si-name" name="name" placeholder="Full name" autoComplete="name" required />
            </>
          )}
          <label className="sr-only" htmlFor="si-email">Email</label>
          <input id="si-email" name="email" type="email" placeholder="Email" autoComplete="email" required />
          {joining && (
            <>
              <label className="sr-only" htmlFor="si-headline">Headline</label>
              <input id="si-headline" name="headline" placeholder="Headline, e.g. VP Events at Acme (optional)" />
            </>
          )}
          <button className={googleEnabled ? "btn btn-quiet-solid" : "btn"} type="submit">
            Email me a link
          </button>
        </form>
      )}
      {!joining && linkedinEnabled && (
        <p className="muted small center">
          Connected LinkedIn before? <a href="/auth/linkedin">Sign in with LinkedIn</a>
        </p>
      )}
      {placeholderEnabled && !joining && (
        <form method="post" action="/api/signin" className="stack">
          <input name="email" type="email" placeholder="Member email" required />
          <button className="btn" type="submit">
            Member sign in
          </button>
          <p className="muted small">Placeholder sign-in for local testing.</p>
        </form>
      )}
    </div>
  );
}
