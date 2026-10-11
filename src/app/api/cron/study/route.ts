import { NextResponse } from "next/server";
import { deliverDeadlineReminders, deliverStudyReminders } from "@/features/student-tools/reminders";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const study = await deliverStudyReminders();
    const deadlines = await deliverDeadlineReminders();
    return NextResponse.json({ ok: true, created: study.created + deadlines.created, study: study.created, deadlines: deadlines.created });
  }
  catch { return NextResponse.json({ error: "server_error" }, { status: 500 }); }
}
