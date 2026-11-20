import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { baseUrl, googleEnabled } from "@/lib/config";
import { secureCookies } from "@/lib/auth";

// Step 1 of Sign in with Google (OpenID Connect).
export async function GET(req: NextRequest) {
  if (!googleEnabled) return NextResponse.redirect(new URL("/", req.url));
  const state = randomBytes(16).toString("hex");
  const invite = (req.nextUrl.searchParams.get("invite") || "").slice(0, 40);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${baseUrl(req.nextUrl.origin)}/auth/google/callback`);
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(url);
  res.cookies.set("g_state", JSON.stringify({ state, invite }), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    maxAge: 600,
  });
  return res;
}
