"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/types";
import type { ReactNode } from "react";

export const field = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const panel = "space-y-4 rounded-xl border bg-card p-5";
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1 text-sm font-medium"><span>{label}</span>{children}</label>;
}
export function useToolAction() {
  const [pending, start] = useTransition();
  const router = useRouter();
  function run<T>(action: () => Promise<ActionResult<T>>, message: string, onSuccess?: (data: T) => void) {
    start(async () => {
      try {
        const result = await action();
        if (!result.success) { toast.error(result.error); return; }
        if (message) toast.success(message);
        onSuccess?.(result.data);
        router.refresh();
      } catch { toast.error("Xatolik yuz berdi. Qayta urinib ko'ring."); }
    });
  }
  return { pending, run };
}
