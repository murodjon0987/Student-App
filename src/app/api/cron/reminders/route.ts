import { NextResponse } from "next/server";
import { deliverDeadlineReminders } from "@/features/student-tools/reminders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await deliverDeadlineReminders()) });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
