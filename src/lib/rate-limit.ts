import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

/** Atomic PostgreSQL counter; shared across workers and serverless instances. */
export async function consumeRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(windowMs) || windowMs < 1) {
    throw new Error("Invalid rate limit policy");
  }
  const digest = createHash("sha256").update(identifier).digest("hex");
  const key = `${scope}:${digest}`;
  const [row] = await prisma.$queryRaw<{ count: number; resetsAt: Date }[]>`
    INSERT INTO "RequestRateLimit" ("key", "count", "resetsAt")
    VALUES (${key}, 1, CURRENT_TIMESTAMP + (${windowMs} * INTERVAL '1 millisecond'))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RequestRateLimit"."resetsAt" <= CURRENT_TIMESTAMP
        THEN 1 ELSE LEAST("RequestRateLimit"."count"::bigint + 1, 2147483647)::integer END,
      "resetsAt" = CASE WHEN "RequestRateLimit"."resetsAt" <= CURRENT_TIMESTAMP
        THEN CURRENT_TIMESTAMP + (${windowMs} * INTERVAL '1 millisecond')
        ELSE "RequestRateLimit"."resetsAt" END
    RETURNING "count", "resetsAt"
  `;
  if (!row) throw new Error("Rate limit storage unavailable");
  return {
    allowed: row.count <= limit,
    retryAfter: Math.max(1, Math.ceil((row.resetsAt.getTime() - Date.now()) / 1000)),
  };
}

/** Only trust proxy-added client addresses on the configured deployment. */
export function clientAddress(requestHeaders: Headers) {
  const trusted = process.env.VERCEL === "1" || process.env.TRUST_PROXY === "1";
  if (!trusted) return "local";
  const header = process.env.VERCEL === "1" ? "x-vercel-forwarded-for" : "x-forwarded-for";
  return requestHeaders.get(header)?.split(",")[0]?.trim().slice(0, 100) || "unknown";
}

export async function limitAuthRequest(scope: string, identifier: string, limit = 8) {
  const address = clientAddress(await headers());
  const results = await Promise.all([
    consumeRateLimit(`${scope}:identity`, identifier, limit, 15 * 60_000),
    consumeRateLimit(`${scope}:address`, address, 40, 15 * 60_000),
  ]);
  return results.every((result) => result.allowed);
}
