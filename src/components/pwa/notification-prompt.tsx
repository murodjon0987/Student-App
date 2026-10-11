"use client";

import * as React from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  enablePush,
  getPushPermission,
  isPushDisabledByUser,
  isPushSupported,
} from "@/features/notifications/push-client";

const DISMISS_KEY = "push-prompt-dismissed-at";
const RECHECK_MS = 3 * 24 * 60 * 60 * 1000;

export function NotificationPrompt() {
  const [visible, setVisible] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!isPushSupported()) return;

    const permission = getPushPermission();

    if (permission === "granted") {
      if (!isPushDisabledByUser()) void enablePush();
      return;
    }

    if (permission !== "default") return;
    if (isPushDisabledByUser()) return;

    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < RECHECK_MS) return;

    setVisible(true);
  }, []);

  if (!visible) return null;

  async function onEnable() {
    setBusy(true);
    const result = await enablePush();
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error ?? "Xatolik yuz berdi");
      return;
    }
    setVisible(false);
    toast.success("Bildirishnomalar yoqildi");
  }

  function onLater() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(5rem_+_env(safe-area-inset-bottom,0px))] z-40 lg:left-auto lg:right-6 lg:bottom-6 lg:w-full lg:max-w-sm">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bell className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Bildirishnomalarni yoqing</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Kunlik eslatmalar va yangilanishlarni o&apos;tkazib yubormang.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={onEnable} disabled={busy}>
              Yoqish
            </Button>
            <Button size="sm" variant="ghost" onClick={onLater}>
              Keyinroq
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={onLater}
          aria-label="Yopish"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
