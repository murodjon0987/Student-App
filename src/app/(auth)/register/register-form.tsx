"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";

import { register } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { GoogleButton } from "@/components/shared/google-button";

export function RegisterForm() {
  const [state, action] = useActionState(register, undefined);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Hisob yarating</h1>
        <p className="text-sm text-muted-foreground">
          Bepul boshlang va o'qishingizni tizimlashtiring.
        </p>
      </div>

      <GoogleButton />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">yoki</span>
        </div>
      </div>

      {state?.message && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {state.message}
        </div>
      )}

      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">To'liq ism</Label>
          <Input id="name" name="name" placeholder="Ism Familiya" required />
          {state?.errors?.name && (
            <p className="text-xs text-destructive">{state.errors.name[0]}</p>
          )}
        </div>

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
          <Label htmlFor="password">Parol</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Kamida 8 ta belgi"
            autoComplete="new-password"
            required
          />
          {state?.errors?.password ? (
            <ul className="space-y-0.5 text-xs text-destructive">
              {state.errors.password.map((error) => (
                <li key={error}>• {error}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              Kamida 8 ta belgi, bitta harf va bitta raqam.
            </p>
          )}
        </div>

        <SubmitButton className="w-full" pendingText="Yaratilmoqda...">
          Ro'yxatdan o'tish
        </SubmitButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Hisobingiz bormi?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Kirish
        </Link>
      </p>
    </div>
  );
}
