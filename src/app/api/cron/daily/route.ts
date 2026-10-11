import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/features/notifications/push";
import { getDailyMessage } from "@/features/notifications/daily-messages";
import { notificationRecipientsWhere } from "@/features/notifications/preferences";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 200;
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

async function createDailyBatch(
  now: Date,
  cursor: string | undefined,
  message: ReturnType<typeof getDailyMessage>
) {
  const local = new Date(now.getTime() + TASHKENT_OFFSET_MS);
  const start = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
      TASHKENT_OFFSET_MS
  );
  const end = new Date(start.getTime() + 86_400_000);

  // Concurrent cron deliveries must not create and send the same daily reminder.
  // Retry PostgreSQL serialization conflicts after the competing run commits.
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const users = await tx.user.findMany({
            where: {
              ...notificationRecipientsWhere,
              ...(cursor ? { id: { gt: cursor } } : {}),
              notifications: {
                none: {
                  title: message.title,
                  message: message.body,
                  type: "REMINDER",
                  createdAt: { gte: start, lt: end },
                },
              },
            },
            orderBy: { id: "asc" },
            take: BATCH_SIZE,
            select: { id: true },
          });

          if (users.length > 0) {
            await tx.notification.createMany({
              data: users.map((user) => ({
                userId: user.id,
                title: message.title,
                message: message.body,
                type: "REMINDER",
                link: message.link,
                createdAt: now,
              })),
            });
          }
          return users;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (
        attempt >= 2 ||
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2034"
      ) {
        throw error;
      }
    }
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const message = getDailyMessage(new Date(now.getTime() + TASHKENT_OFFSET_MS));

  try {
    await prisma.requestRateLimit.deleteMany({
      where: { resetsAt: { lte: now } },
    });

    let cursor: string | undefined;
    let users = 0;
    let sent = 0;
    let removed = 0;

    while (true) {
      const batch = await createDailyBatch(now, cursor, message);
      if (batch.length === 0) break;

      const push = await sendPushToUsers(batch.map((user) => user.id), {
        title: message.title,
        body: message.body,
        url: message.link,
        tag: "daily-reminder",
      });
      users += batch.length;
      sent += push.sent;
      removed += push.removed;
      if (batch.length < BATCH_SIZE) break;
      cursor = batch[batch.length - 1].id;
    }

    return NextResponse.json({
      ok: true,
      title: message.title,
      users,
      sent,
      removed,
    });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
