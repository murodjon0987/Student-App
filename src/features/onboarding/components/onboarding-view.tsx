"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarCheck,
  CheckSquare,
  Download,
  GraduationCap,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { BrandMark } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markOnboardingDone } from "../storage";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function useInstallPrompt() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia("(display-mode: standalone)");
    setStandalone(mql.matches);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setStandalone(true);
      setDeferred(null);
    };
    const onChange = (event: MediaQueryListEvent) => setStandalone(event.matches);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    mql.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mql.removeEventListener("change", onChange);
    };
  }, []);

  const install = React.useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setDeferred(null);
  }, [deferred]);

  return { canInstall: Boolean(deferred), installed: standalone, install };
}

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: CalendarDays, title: "Dars jadvali", text: "Haftalik darslar va kalendar" },
  { icon: CheckSquare, title: "Vazifalar", text: "Uy vazifasi va shaxsiy rejalar" },
  { icon: GraduationCap, title: "Imtihonlar", text: "Tayyorgarlik va testlar" },
  { icon: CalendarCheck, title: "Davomat", text: "Darslarga qatnashish nazorati" },
  { icon: Wallet, title: "Budjet", text: "Oylik xarajatlar hisobi" },
  { icon: Sparkles, title: "AI yordamchi", text: "O'qish bo'yicha savol-javob" },
];

interface Slide {
  title: string;
  description: string;
  render: () => React.ReactNode;
}

export function OnboardingView({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = React.useState(0);
  const { canInstall, installed, install } = useInstallPrompt();
  const last = index === 2;

  const slides: Slide[] = [
    {
      title: "Student App'ga xush kelibsiz",
      description:
        "Dars jadvali, vazifalar, imtihonlar va xarajatlaringizni bitta joyda boshqaring.",
      render: () => (
        <div className="space-y-6 text-center">
          <div className="relative mx-auto flex size-28 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl" />
            <BrandMark className="relative size-20 rounded-3xl shadow-xl" />
          </div>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            O'qishni rejalashtiring, natijalarni kuzating va har kuni ozgina
            bo'lsa ham maqsad sari yaqinlashing.
          </p>
        </div>
      ),
    },
    {
      title: "Siz uchun nimalar bor?",
      description: "Kundalik o'qishingizga kerak bo'ladigan asosiy vositalar.",
      render: () => (
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card/80 p-4 text-left"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Boshlashga tayyormisiz?",
      description:
        "Ilovani telefon ekraniga o'rnatsangiz, tez ochiladi va bildirishnomalar keladi.",
      render: () => (
        <div className="space-y-4">
          <div className="mx-auto flex size-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <Download className="size-9" />
          </div>
          {canInstall ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => void install()}
            >
              <Download className="size-4" /> Ilovani o'rnatish
            </Button>
          ) : (
            <p className="rounded-xl border border-border bg-card/80 px-4 py-3 text-center text-xs leading-relaxed text-muted-foreground">
              {installed
                ? "Ilova allaqachon o'rnatilgan."
                : "Brauzer menyusidagi “Bosh ekranga qo'shish” orqali ilovani o'rnatishingiz mumkin."}
            </p>
          )}
          <p className="text-center text-xs text-muted-foreground">
            O'rnatish majburiy emas — brauzerda ham ishlaydi.
          </p>
        </div>
      ),
    },
  ];

  const slide = slides[index];

  function next() {
    if (last) {
      markOnboardingDone();
      onComplete();
      return;
    }
    setIndex((value) => Math.min(value + 1, slides.length - 1));
  }

  function skip() {
    markOnboardingDone();
    onComplete();
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(110%_75%_at_50%_0%,rgba(124,58,237,0.22),transparent_70%)]" />

      <header className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top,0px))]">
        <span className="flex items-center gap-2 text-sm font-bold">
          <BrandMark className="size-7 rounded-lg" /> Student App
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={skip}>
          O'tkazib yuborish
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-8">
        <div key={index} className="animate-fade-in-up space-y-5">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold leading-tight">{slide.title}</h1>
            <p className="text-sm text-muted-foreground">{slide.description}</p>
          </div>
          {slide.render()}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-md space-y-5 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Tanishuv qadamlari">
          {slides.map((item, dot) => (
            <button
              key={item.title}
              type="button"
              role="tab"
              aria-selected={dot === index}
              aria-label={`${dot + 1}-qadam`}
              onClick={() => setIndex(dot)}
              className={cn(
                "h-2 rounded-full transition-all",
                dot === index ? "w-6 bg-primary" : "w-2 bg-border"
              )}
            />
          ))}
        </div>

        {last ? (
          <div className="grid gap-3">
            <Button asChild size="lg">
              <Link href="/register" onClick={onComplete}>
                Boshlash <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login" onClick={onComplete}>
                Menda hisob bor
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIndex((value) => Math.max(value - 1, 0))}
              disabled={index === 0}
              aria-label="Orqaga"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <Button type="button" size="lg" className="flex-1" onClick={next}>
              Keyingi <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </footer>
    </div>
  );
}
