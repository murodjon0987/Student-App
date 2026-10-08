import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendPushToAll } from "@/features/notifications/push";
import { getDailyMessage } from "@/features/notifications/daily-messages";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const message = getDailyMessage(new Date());

  try {
    const users = await prisma.user.findMany({ select: { id: true } });

    if (users.length > 0) {
      await prisma.notification.createMany({
        data: users.map((user) => ({
          userId: user.id,
          title: message.title,
          message: message.body,
          type: "REMINDER",
          link: message.link,
        })),
      });
    }

    const push = await sendPushToAll({
      title: message.title,
      body: message.body,
      url: message.link,
      tag: "daily-reminder",
    });

    return NextResponse.json({
      ok: true,
      title: message.title,
      users: users.length,
      ...push,
    });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
