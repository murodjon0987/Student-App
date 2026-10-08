"use client";

import * as React from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import {
  subscribeToUpdates,
  unsubscribeFromUpdates,
} from "@/features/notifications/actions";

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

export function PushToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [busy, setBusy] = React.useState(false);
  const [supported, setSupported] = React.useState(false);

  React.useEffect(() => {
    setSupported(
      "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
  }, []);

  async function enable() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      toast.error("Push bildirishnomalar serverda sozlanmagan");
      return;
    }

    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Bildirishnomaga ruxsat berilmadi");
        return;
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

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setEnabled(true);
      toast.success("Yangilanish bildirishnomalari yoqildi");
    } catch {
      toast.error("Obuna bo'lishda xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromUpdates(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setEnabled(false);
      toast.success("Yangilanish bildirishnomalari o'chirildi");
    } catch {
      toast.error("O'chirishda xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">Yangilanish bildirishnomalari</p>
        <p className="text-xs text-muted-foreground">
          Yangi versiya chiqqanda qurilmaga bildirishnoma yuboriladi.
        </p>
      </div>
      <Switch
        checked={enabled}
        disabled={busy || !supported}
        onCheckedChange={(checked) => {
          if (checked) void enable();
          else void disable();
        }}
      />
    </div>
  );
}
