import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";

export async function getNotifications() {
  const { userId } = await verifySession();
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export type NotificationItem = Awaited<
  ReturnType<typeof getNotifications>
>[number];
