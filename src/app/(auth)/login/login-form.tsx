"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";

import { login } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { GoogleButton } from "@/components/shared/google-button";

const GOOGLE_ERRORS: Record<string, string> = {
  google_not_configured:
    "Google orqali kirish hozircha sozlanmagan. Administrator bilan bog'laning.",
  google_state: "Google orqali kirish seansi eskirgan. Qaytadan urinib ko'ring.",
  google_token: "Google bilan bog'lanishda xatolik yuz berdi. Qaytadan urinib ko'ring.",
  google_email: "Google hisobingizdan email manzilini olib bo'lmadi.",
  google_failed:
    "Google orqali kirishda kutilmagan xatolik. Iltimos, keyinroq qaytadan urinib ko'ring.",
};

export function LoginForm({
  notice,
  error,
  next,
  detail,
}: {
  notice?: string;
  error?: string;
  next?: string;
  detail?: string;
}) {
  const [state, action] = useActionState(login, undefined);
  const errorMessage = error ? GOOGLE_ERRORS[error] ?? "Xatolik yuz berdi." : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Xush kelibsiz!</h1>
        <p className="text-sm text-muted-foreground">
          Hisobingizga kirib o'qishni davom ettiring.
        </p>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          {notice}
        </div>
      )}

      {(state?.message || errorMessage) && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            <p>{state?.message ?? errorMessage}</p>
            {detail && (
              <p className="break-all text-xs opacity-80">{detail}</p>
            )}
          </div>
        </div>
      )}

      <GoogleButton next={next ?? "/dashboard"} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">yoki</span>
        </div>
      </div>

      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="student@example.com"
            autoComplete="email"
            required
          />
          {state?.errors?.email && (
            <p className="text-xs text-destructive">{state.errors.email[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Parol</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Parolni unutdingizmi?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          {state?.errors?.password && (
            <p className="text-xs text-destructive">
              {state.errors.password[0]}
            </p>
          )}
        </div>

        <SubmitButton className="w-full" pendingText="Kirilmoqda...">
          Kirish
        </SubmitButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Hisobingiz yo'qmi?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Ro'yxatdan o'tish
        </Link>
      </p>
    </div>
  );
}
