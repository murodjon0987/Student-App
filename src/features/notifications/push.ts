import "server-only";

import webpush from "web-push";

import { prisma } from "@/lib/prisma";
import { fail, ok, type ActionResult } from "@/lib/types";
import { notificationRecipientsWhere } from "./preferences";

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

// A user may register a push subscription from a limited number of devices.
export const MAX_PUSH_SUBSCRIPTIONS = 20;

// Web-push endpoints are always HTTPS capability URLs.
export function isValidPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const endpoint = value.trim();
  if (!endpoint || endpoint.length > 2048) return false;
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

// p256dh/auth are base64url-encoded; reject arbitrary strings before storing.
export function isValidPushKey(value: unknown, min: number, max: number): value is string {
  return (
    typeof value === "string" &&
    value.length >= min &&
    value.length <= max &&
    /^[A-Za-z0-9_-]+={0,2}$/.test(value)
  );
}

export function validatePushSubscription(
  subscription: PushSubscriptionInput | null | undefined
): { endpoint: string; p256dh: string; auth: string } | null {
  if (!subscription || typeof subscription !== "object") return null;
  const endpoint = subscription.endpoint;
  const keys = subscription.keys;
  if (!isValidPushEndpoint(endpoint) || !keys) return null;
  if (!isValidPushKey(keys.p256dh, 40, 200) || !isValidPushKey(keys.auth, 16, 100)) {
    return null;
  }
  return {
    endpoint: endpoint.trim(),
    p256dh: keys.p256dh.trim(),
    auth: keys.auth.trim(),
  };
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

  const valid = validatePushSubscription(subscription);
  if (!valid) {
    return fail("Obuna ma'lumotlari noto'g'ri");
  }

  try {
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint: valid.endpoint },
      select: { userId: true },
    });
    if (!existing || existing.userId !== userId) {
      const count = await prisma.pushSubscription.count({ where: { userId } });
      if (count >= MAX_PUSH_SUBSCRIPTIONS) {
        return fail("Obunalar soni chegaradan oshdi");
      }
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: valid.endpoint },
      create: {
        userId,
        endpoint: valid.endpoint,
        p256dh: valid.p256dh,
        auth: valid.auth,
        userAgent: userAgent?.slice(0, 500) ?? null,
      },
      update: {
        userId,
        p256dh: valid.p256dh,
        auth: valid.auth,
        userAgent: userAgent?.slice(0, 500) ?? null,
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
  return sendPushToUsers([userId], payload);
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0) return { sent: 0, removed: 0 };

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      user: {
        is: { ...notificationRecipientsWhere, id: { in: userIds } },
      },
    },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  return deliverToSubscriptions(subscriptions, payload);
}

export async function sendPushToAll(payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user: { is: notificationRecipientsWhere } },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  return deliverToSubscriptions(subscriptions, payload);
}
