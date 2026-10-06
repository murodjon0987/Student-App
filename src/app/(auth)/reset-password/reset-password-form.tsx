"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { resetPassword } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, undefined);

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="size-10 text-destructive" />
          <h1 className="text-xl font-bold">Havola yaroqsiz</h1>
          <p className="text-sm text-muted-foreground">
            Parolni tiklash havolasi topilmadi yoki muddati o'tgan.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Qaytadan urinish
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Yangi parol</h1>
        <p className="text-sm text-muted-foreground">
          Hisobingiz uchun yangi parol o'rnating.
        </p>
      </div>

      {state?.message && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {state.message}
        </div>
      )}

      <form action={action} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <div className="space-y-2">
          <Label htmlFor="password">Yangi parol</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Kamida 8 ta belgi"
            autoComplete="new-password"
            required
          />
          {state?.errors?.password && (
            <ul className="space-y-0.5 text-xs text-destructive">
              {state.errors.password.map((error) => (
                <li key={error}>• {error}</li>
              ))}
            </ul>
          )}
        </div>

        <SubmitButton className="w-full" pendingText="Yangilanmoqda...">
          Parolni yangilash
        </SubmitButton>
      </form>
    </div>
  );
}
