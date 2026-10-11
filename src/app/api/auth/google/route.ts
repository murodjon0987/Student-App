import { type NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { getSessionKey } from "@/lib/auth/token";
import { safeNextPath } from "@/lib/auth/security";

import {
  getGoogleClient,
  GOOGLE_AUTH_URL,
  googleRedirectUri,
} from "@/lib/auth/google";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const client = getGoogleClient();

  if (!client) {
    return NextResponse.redirect(
      new URL("/login?error=google_not_configured", origin)
    );
  }

  const nextParam = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const next = safeNextPath(nextParam);

  const secret = getSessionKey();
  const state = await new SignJWT({ nonce: crypto.randomUUID(), next })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", client.clientId);
  url.searchParams.set("redirect_uri", googleRedirectUri(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(url.toString());
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
