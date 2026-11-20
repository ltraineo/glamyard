export const APP_NAME = process.env.APP_NAME || "Who's Going";

export const INVITE_CAP = process.env.INVITE_CAP
  ? parseInt(process.env.INVITE_CAP, 10)
  : null;

export const linkedinEnabled = !!process.env.LINKEDIN_CLIENT_ID;

export function baseUrl(fallbackOrigin: string) {
  return (process.env.APP_URL || fallbackOrigin).replace(/\/$/, "");
}
