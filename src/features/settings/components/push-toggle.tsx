"use client";

import * as React from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import {
  disablePush,
  enablePush,
  isPushSupported,
} from "@/features/notifications/push-client";

export function PushToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [busy, setBusy] = React.useState(false);
  const [supported, setSupported] = React.useState(false);

  React.useEffect(() => {
    setSupported(isPushSupported());
  }, []);

  async function enable() {
    setBusy(true);
    const result = await enablePush();
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error ?? "Xatolik yuz berdi");
      return;
    }
    setEnabled(true);
    toast.success("Yangilanish bildirishnomalari yoqildi");
  }

  async function disable() {
    setBusy(true);
    const result = await disablePush();
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error ?? "Xatolik yuz berdi");
      return;
    }
    setEnabled(false);
    toast.success("Yangilanish bildirishnomalari o'chirildi");
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">Yangilanish bildirishnomalari</p>
        <p className="text-xs text-muted-foreground">
          Yangi versiya va kunlik eslatmalar qurilmaga yuboriladi.
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
