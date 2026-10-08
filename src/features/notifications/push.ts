import "server-only";

import webpush from "web-push";

import { prisma } from "@/lib/prisma";
import { fail, ok, type ActionResult } from "@/lib/types";

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let configured = false;

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@student.app",
    publicKey,
    privateKey
  );
  configured = true;
  return true;
}

export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionInput,
  userAgent?: string | null
): Promise<ActionResult> {
  if (!isPushConfigured()) {
    return fail("Push bildirishnomalar serverda sozlanmagan");
  }

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent ?? null,
      },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent ?? null,
      },
    });
    return ok();
  } catch {
    return fail("Obunani saqlashda xatolik");
  }
}

export async function removePushSubscription(
  userId: string,
  endpoint: string
): Promise<ActionResult> {
  try {
    await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return ok();
  } catch {
    return fail("Obunani o'chirishda xatolik");
  }
}

export async function hasPushSubscription(userId: string): Promise<boolean> {
  const count = await prisma.pushSubscription.count({ where: { userId } });
  return count > 0;
}

async function deliverToSubscriptions(
  subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload
) {
  if (!ensureConfigured()) return { sent: 0, removed: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  const expiredIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body
        );
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(subscription.id);
        }
      }
    })
  );

  if (expiredIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: expiredIds } },
    });
  }

  return { sent, removed: expiredIds.length };
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  return deliverToSubscriptions(subscriptions, payload);
}

export async function sendPushToAll(payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  return deliverToSubscriptions(subscriptions, payload);
}
