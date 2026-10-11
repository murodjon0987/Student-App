import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionPayload = {
  userId: string;
  sessionVersion: number;
  expiresAt: string;
};

export function getSessionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || (process.env.NODE_ENV === "production" && new TextEncoder().encode(secret).length < 32)) {
    throw new Error("SESSION_SECRET must be configured (at least 32 bytes in production)");
  }
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("student-app")
    .setAudience("student-app")
    .setIssuedAt()
    .setExpirationTime(Math.floor(new Date(payload.expiresAt).getTime() / 1000))
    .sign(getSessionKey());
}

/** Signature check for optimistic routing; data access also checks the database. */
export async function decrypt(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionKey(), {
      algorithms: ["HS256"],
      issuer: "student-app",
      audience: "student-app",
    });
    if (
      typeof payload.userId !== "string" || !payload.userId ||
      typeof payload.sessionVersion !== "number" || !Number.isSafeInteger(payload.sessionVersion) || payload.sessionVersion < 0 ||
      typeof payload.expiresAt !== "string" || !Number.isFinite(Date.parse(payload.expiresAt)) ||
      Date.parse(payload.expiresAt) <= Date.now()
    ) return null;
    return {
      userId: payload.userId,
      sessionVersion: payload.sessionVersion,
      expiresAt: payload.expiresAt,
    } satisfies SessionPayload;
  } catch {
    return null;
  }
}
