"use client";

import * as React from "react";
import { toast } from "sonner";

const BUILD_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
const DEVELOPMENT = process.env.NODE_ENV !== "production";
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
    let disposed = false;
    let applyingUpdate = false;
    let waitingWorker: ServiceWorker | null = null;
    let registration: ServiceWorkerRegistration | null = null;

    const reload = () => {
      if (reloading || disposed) return;
      reloading = true;
      window.location.reload();
    };

    const applyUpdate = () => {
      const worker = registration?.waiting ?? waitingWorker;
      if (worker) {
        applyingUpdate = true;
        worker.postMessage({ type: "SKIP_WAITING" });
      } else {
        reload();
      }
    };

    const notifyUpdate = () => {
      if (notified || reloading || disposed) return;
      notified = true;
      toast("Yangi versiya mavjud", {
        description: "Ilovani yangilash uchun tugmani bosing.",
        duration: Number.POSITIVE_INFINITY,
        action: { label: "Yangilash", onClick: applyUpdate },
      });
    };

    const onControllerChange = () => {
      if (applyingUpdate || DEVELOPMENT) reload();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "RELOAD") reload();
    };
    const onWorkerStateChange = (event: Event) => {
      const worker = event.target as ServiceWorker;
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        waitingWorker = worker;
        notifyUpdate();
      }
    };
    const onUpdateFound = () => {
      const worker = registration?.installing;
      if (worker) worker.addEventListener("statechange", onWorkerStateChange);
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(`/sw.js?v=${encodeURIComponent(DEVELOPMENT ? "dev" : BUILD_VERSION)}`, {
          scope: "/",
          updateViaCache: "none",
        })
        .then((registered) => {
          if (disposed) return;
          registration = registered;
          registered.addEventListener("updatefound", onUpdateFound);
          if (registered.waiting) {
            waitingWorker = registered.waiting;
            notifyUpdate();
          }
          onUpdateFound();
        })
        .catch(() => {});

      navigator.serviceWorker.addEventListener("message", onMessage);
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
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
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      registration?.removeEventListener("updatefound", onUpdateFound);
      registration?.installing?.removeEventListener("statechange", onWorkerStateChange);
      waitingWorker?.removeEventListener("statechange", onWorkerStateChange);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onMessage);
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      }
    };
  }, []);

  return null;
}
