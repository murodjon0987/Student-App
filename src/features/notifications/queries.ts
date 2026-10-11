import "server-only";

import type { Prisma, Notification } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { param, queryPage, type ListParams } from "@/lib/pagination";
import { literalSearch } from "@/lib/list-query";

export async function getNotifications(params: ListParams = {}) {
  const { userId } = await verifySession();
  const q = param(params, "q");
  const read = param(params, "read");
  const where: Prisma.NotificationWhereInput = { userId,
    ...(read === "unread" ? { read: false } : read === "read" ? { read: true } : {}),
    ...(q ? { OR: [{ title: { contains: literalSearch(q), mode: "insensitive" } }, { message: { contains: literalSearch(q), mode: "insensitive" } }] } : {}),
  };
  const [result, unreadCount] = await Promise.all([
    queryPage(params.page, () => prisma.notification.count({ where }),
      (range) => prisma.notification.findMany({ where, ...range, orderBy: [{ createdAt: "desc" }, { id: "desc" }] })),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);
  return { ...result, unreadCount };
}

export type NotificationItem = Notification;
