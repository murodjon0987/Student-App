"use client";

import * as React from "react";
import { toast } from "sonner";

const BUILD_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
const CHECK_INTERVAL_MS = 60_000;

async function fetchServerVersion(): Promise<string | null> {
  try {
    const response = await fetch("/api/version", { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

export function PwaUpdater() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    let reloading = false;
    let notified = false;

    const reload = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    const notifyUpdate = () => {
      if (notified || reloading) return;
      notified = true;
      toast("Yangi versiya mavjud", {
        description: "Ilovani yangilash uchun tugmani bosing.",
        duration: Number.POSITIVE_INFINITY,
        action: { label: "Yangilash", onClick: reload },
      });
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(`/sw.js?v=${encodeURIComponent(BUILD_VERSION)}`, {
          scope: "/",
        })
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                notifyUpdate();
              }
            });
          });
        })
        .catch(() => {});

      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "RELOAD") reload();
      });
    }

    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const serverVersion = await fetchServerVersion();
      if (serverVersion && serverVersion !== BUILD_VERSION) notifyUpdate();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    void check();
    const interval = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  return null;
}
