import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { listAttachments } from "@/features/attachments/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const items = await listAttachments(session.userId, {
    homeworkId: url.searchParams.get("homeworkId"),
    noteId: url.searchParams.get("noteId"),
    materialId: url.searchParams.get("materialId"),
  });

  return NextResponse.json({ items });
}
