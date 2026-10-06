import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    sessionSecret: Boolean(process.env.SESSION_SECRET),
    googleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
    googleClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
  };

  let database = "up";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "down";
  }

  return NextResponse.json({
    status: database === "up" ? "ok" : "error",
    database,
    env,
    timestamp: new Date().toISOString(),
  });
}
