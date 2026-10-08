import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

export async function GET() {
  return NextResponse.json(
    { version: VERSION },
    { headers: { "Cache-Control": "no-store" } }
  );
}
