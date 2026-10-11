import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt, SESSION_COOKIE_NAME, SESSION_DURATION_MS } from "./token";

export { decrypt, encrypt, SESSION_COOKIE_NAME } from "./token";
export type { SessionPayload } from "./token";

export async function createSession(userId: string, expectedVersion?: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });
  if (!user || (expectedVersion !== undefined && expectedVersion !== user.sessionVersion)) {
    throw new Error("Account credentials have changed; please sign in again");
  }
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = await encrypt({ userId, sessionVersion: user.sessionVersion, expiresAt: expiresAt.toISOString() });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

/** Required for every protected operation, including routes excluded by Proxy. */
export async function getAuthenticatedSession(token?: string) {
  const session = await decrypt(token ?? await getSessionToken());
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { sessionVersion: true },
  });
  if (!user || user.sessionVersion !== session.sessionVersion) return null;
  return session;
}
