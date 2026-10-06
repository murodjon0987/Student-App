import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import {
  getGoogleClient,
  GOOGLE_TOKEN_URL,
  googleRedirectUri,
  verifyGoogleIdToken,
} from "@/lib/auth/google";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const fail = (reason: string, detail?: string) => {
    const url = new URL("/login", origin);
    url.searchParams.set("error", reason);
    if (detail) url.searchParams.set("detail", detail.slice(0, 300));
    return NextResponse.redirect(url);
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
        new TextEncoder().encode(process.env.SESSION_SECRET),
        { algorithms: ["HS256"] }
      );
      if (typeof payload.next === "string" && payload.next.startsWith("/")) {
        next = payload.next;
      }
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
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text().catch(() => "");
      console.error("[google callback] token exchange failed", text);
      return fail("google_token", text);
    }
    const tokens = (await tokenResponse.json()) as { id_token?: string };
    if (!tokens.id_token) return fail("google_token", "id_token yo'q");

    let profile;
    try {
      profile = await verifyGoogleIdToken(tokens.id_token, client.clientId);
    } catch (error) {
      console.error("[google callback] id_token verify failed", error);
      return fail(
        "google_token",
        error instanceof Error ? error.message : "id_token tekshirilmadi"
      );
    }

    const email = profile.email?.toLowerCase();
    const googleId = profile.sub;
    if (!email || !googleId) return fail("google_email");

    const name = profile.name ?? email.split("@")[0] ?? "Student";
    const picture = profile.picture ?? null;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

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
    return fail(
      "google_failed",
      error instanceof Error ? error.message : "kutilmagan xatolik"
    );
  }
}
