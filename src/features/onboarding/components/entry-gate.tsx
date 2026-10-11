"use client";

import * as React from "react";

import { BrandMark } from "@/components/brand-logo";
import { isOnboardingDone, markOnboardingDone } from "../storage";
import { OnboardingView } from "./onboarding-view";

type Phase = "loading" | "onboarding" | "ready";

/**
 * Birinchi ochilishda tanishuv slaydlarini ko'rsatadi, keyin asosiy
 * sahifani (landing) chiqaradi. localStorage o'qilmaguncha brend splash
 * ko'rsatiladi — shunda noto'g'ri sahifa "miltillab" ko'rinmaydi.
 */
export function EntryGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = React.useState<Phase>("loading");

  React.useEffect(() => {
    setPhase(isOnboardingDone() ? "ready" : "onboarding");
  }, []);

  function finish() {
    markOnboardingDone();
    setPhase("ready");
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <BrandMark className="size-14 animate-pulse rounded-2xl shadow-lg" />
      </div>
    );
  }

  if (phase === "onboarding") {
    return <OnboardingView onComplete={finish} />;
  }

  return <>{children}</>;
}
