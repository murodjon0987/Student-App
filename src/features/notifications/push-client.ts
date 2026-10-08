import { subscribeToUpdates, unsubscribeFromUpdates } from "./actions";

const DISABLED_KEY = "push-disabled";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export function isPushDisabledByUser(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DISABLED_KEY) === "1";
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export interface PushResult {
  ok: boolean;
  error?: string;
}

export async function enablePush(): Promise<PushResult> {
  if (!isPushSupported()) {
    return { ok: false, error: "Bu qurilma bildirishnomalarni qo'llamaydi" };
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return { ok: false, error: "Push bildirishnomalar serverda sozlanmagan" };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, error: "Bildirishnomaga ruxsat berilmadi" };
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const json = subscription.toJSON();
    const result = await subscribeToUpdates({
      endpoint: json.endpoint ?? "",
      keys: {
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      },
    });

    if (!result.success) return { ok: false, error: result.error };

    window.localStorage.removeItem(DISABLED_KEY);
    return { ok: true };
  } catch {
    return { ok: false, error: "Obuna bo'lishda xatolik yuz berdi" };
  }
}

export async function disablePush(): Promise<PushResult> {
  if (!isPushSupported()) return { ok: true };

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await unsubscribeFromUpdates(subscription.endpoint);
      await subscription.unsubscribe();
    }
    window.localStorage.setItem(DISABLED_KEY, "1");
    return { ok: true };
  } catch {
    return { ok: false, error: "O'chirishda xatolik yuz berdi" };
  }
}
