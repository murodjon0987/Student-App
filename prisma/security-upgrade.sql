-- Additive upgrade for installations created with prisma db push.
-- Run once before deploying this code; it preserves existing user data.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "RequestRateLimit" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "resetsAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RequestRateLimit_pkey" PRIMARY KEY ("key")
);
CREATE INDEX IF NOT EXISTS "RequestRateLimit_resetsAt_idx" ON "RequestRateLimit"("resetsAt");
