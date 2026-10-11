import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import { getSessionKey } from "@/lib/auth/token";
import { safeNextPath } from "@/lib/auth/security";
import {
  getGoogleClient,
  GOOGLE_TOKEN_URL,
  googleRedirectUri,
  verifyGoogleIdToken,
} from "@/lib/auth/google";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const fail = (reason: string) => {
    const url = new URL("/login", origin);
    url.searchParams.set("error", reason);
    const response = NextResponse.redirect(url);
    response.cookies.delete("google_oauth_state");
    return response;
  };

  try {
    const client = getGoogleClient();
    if (!client) return fail("google_not_configured");

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const cookieState = request.cookies.get("google_oauth_state")?.value;

    if (!code || !state || !cookieState || state !== cookieState) {
      return fail("google_state");
    }

    let next = "/dashboard";
    try {
      const { payload } = await jwtVerify(
        state,
        getSessionKey(),
        { algorithms: ["HS256"] }
      );
      next = safeNextPath(payload.next);
    } catch {
      return fail("google_state");
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: client.clientId,
        client_secret: client.clientSecret,
        redirect_uri: googleRedirectUri(origin),
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!tokenResponse.ok) {
      console.error("[google callback] token exchange failed", tokenResponse.status);
      return fail("google_token");
    }
    const tokens = (await tokenResponse.json()) as { id_token?: string };
    if (!tokens.id_token) return fail("google_token");

    let profile;
    try {
      profile = await verifyGoogleIdToken(tokens.id_token, client.clientId);
    } catch (error) {
      console.error("[google callback] id_token verify failed", error);
      return fail("google_token");
    }

    const email = profile.email?.toLowerCase();
    const googleId = profile.sub;
    if (!email || !googleId || profile.email_verified !== true) return fail("google_email");

    const name = profile.name ?? email.split("@")[0] ?? "Student";
    const picture = profile.picture ?? null;

    const existing = await prisma.user.findUnique({ where: { googleId } }) ??
      await prisma.user.findUnique({ where: { email } });
    if (existing?.googleId && existing.googleId !== googleId) return fail("google_email");

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            googleId,
            avatarUrl: existing.avatarUrl ?? picture,
            emailVerifiedAt: new Date(),
          },
        })
      : await prisma.user.create({
          data: {
            email,
            name,
            googleId,
            avatarUrl: picture,
            emailVerifiedAt: new Date(),
            profile: { create: {} },
          },
        });

    await createSession(user.id);

    const response = NextResponse.redirect(new URL(next, origin));
    response.cookies.delete("google_oauth_state");
    return response;
  } catch (error) {
    console.error("[google callback] error", error);
    return fail("google_failed");
  }
}
