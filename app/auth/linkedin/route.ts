import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { baseUrl, linkedinEnabled } from "@/lib/config";
import { secureCookies } from "@/lib/auth";

// Step 1 of Sign In with LinkedIn (OpenID Connect): send the person to LinkedIn.
export async function GET(req: NextRequest) {
  if (!linkedinEnabled) return NextResponse.redirect(new URL("/", req.url));
  const state = randomBytes(16).toString("hex");
  const invite = (req.nextUrl.searchParams.get("invite") || "").slice(0, 40);

  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.LINKEDIN_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${baseUrl(req.nextUrl.origin)}/auth/linkedin/callback`);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "openid profile email");

  const res = NextResponse.redirect(url);
  res.cookies.set("li_state", JSON.stringify({ state, invite }), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    maxAge: 600,
  });
  return res;
}
