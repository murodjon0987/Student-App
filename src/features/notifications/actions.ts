"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import {
  removePushSubscription,
  savePushSubscription,
  type PushSubscriptionInput,
} from "./push";

export async function markRead(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  const existing = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!existing) return fail("Bildirishnoma topilmadi");

  try {
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("Yangilashda xatolik yuz berdi");
  }
}

export async function markAllRead(): Promise<ActionResult> {
  const { userId } = await verifySession();

  try {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("Yangilashda xatolik yuz berdi");
  }
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  const existing = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!existing) return fail("Bildirishnoma topilmadi");

  try {
    await prisma.notification.delete({ where: { id } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik yuz berdi");
  }
}

export async function subscribeToUpdates(
  subscription: PushSubscriptionInput
): Promise<ActionResult> {
  const { userId } = await verifySession();

  if (
    !subscription?.endpoint ||
    !subscription.keys?.p256dh ||
    !subscription.keys?.auth
  ) {
    return fail("Obuna ma'lumotlari noto'g'ri");
  }

  const requestHeaders = await headers();
  return savePushSubscription(
    userId,
    subscription,
    requestHeaders.get("user-agent")
  );
}

export async function unsubscribeFromUpdates(
  endpoint: string
): Promise<ActionResult> {
  const { userId } = await verifySession();
  if (!endpoint) return fail("Endpoint topilmadi");
  return removePushSubscription(userId, endpoint);
}
