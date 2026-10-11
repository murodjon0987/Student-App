"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export interface ErrorRecoveryProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export function ErrorRecovery({ error, retry }: ErrorRecoveryProps) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center" role="alert">
      <h1 className="text-2xl font-semibold">Sahifani ochishda xatolik yuz berdi</h1>
      <p className="text-muted-foreground">
        Internet aloqangizni tekshiring va qayta urinib ko&apos;ring.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">Xatolik kodi: {error.digest}</p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={retry}>Qayta urinish</Button>
        <Button variant="outline" asChild>
          <Link href="/">Bosh sahifa</Link>
        </Button>
      </div>
    </div>
  );
}
