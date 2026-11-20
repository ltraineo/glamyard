import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { baseUrl, linkedinEnabled } from "@/lib/config";
import { secureCookies } from "@/lib/auth";

// Step 1 of LinkedIn (OpenID Connect). Used to sign in members who already
// connected LinkedIn, or with ?connect=1 to add LinkedIn to your own profile.
export async function GET(req: NextRequest) {
  if (!linkedinEnabled) return NextResponse.redirect(new URL("/", req.url));
  const state = randomBytes(16).toString("hex");
  const connect = req.nextUrl.searchParams.get("connect") === "1";

  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.LINKEDIN_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${baseUrl(req.nextUrl.origin)}/auth/linkedin/callback`);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "openid profile email");

  const res = NextResponse.redirect(url);
  res.cookies.set("li_state", JSON.stringify({ state, connect }), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    maxAge: 600,
  });
  return res;
}
