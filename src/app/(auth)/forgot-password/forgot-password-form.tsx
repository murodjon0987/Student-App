"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { forgotPassword } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPassword, undefined);
  const debugUrl = state?.errors?.__debug?.[0];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Parolni tiklash</h1>
        <p className="text-sm text-muted-foreground">
          Email manzilingizni kiriting — tiklash havolasini yuboramiz.
        </p>
      </div>

      {state?.success && (
        <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            {state.message}
          </div>
          {debugUrl && (
            <Link
              href={debugUrl}
              className="block break-all font-medium underline"
            >
              Tiklash havolasini ochish
            </Link>
          )}
        </div>
      )}

      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="student@example.com"
            required
          />
          {state?.errors?.email && (
            <p className="text-xs text-destructive">{state.errors.email[0]}</p>
          )}
        </div>

        <SubmitButton className="w-full" pendingText="Yuborilmoqda...">
          Havolani yuborish
        </SubmitButton>
      </form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Kirishga qaytish
      </Link>
    </div>
  );
}
