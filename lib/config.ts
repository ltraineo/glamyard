export const APP_NAME = process.env.APP_NAME || "Who's Going";

export const INVITE_CAP = process.env.INVITE_CAP
  ? parseInt(process.env.INVITE_CAP, 10)
  : null;

export const linkedinEnabled = !!process.env.LINKEDIN_CLIENT_ID;
export const googleEnabled = !!process.env.GOOGLE_CLIENT_ID;
export const emailEnabled = !!process.env.RESEND_API_KEY;

// The placeholder email-only sign-in (no verification) exists only for local
// development, and switches off as soon as any real sign-in is configured.
export const placeholderEnabled = !linkedinEnabled && !googleEnabled && !emailEnabled;

export const EMAIL_FROM = process.env.EMAIL_FROM || `${APP_NAME} <hello@glamyard.io>`;

export function baseUrl(fallbackOrigin: string) {
  return (process.env.APP_URL || fallbackOrigin).replace(/\/$/, "");
}
