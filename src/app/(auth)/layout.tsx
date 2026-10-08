import Link from "next/link";
import { ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

import { BrandMark } from "@/components/brand-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_55%_at_50%_0%,rgba(124,58,237,0.28),transparent_60%)] lg:hidden" />
      <div className="flex flex-col p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark className="size-9 rounded-xl shadow-sm" />
          <span className="text-sm font-bold">Student App</span>
        </Link>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#4f46e5,#7c3aed,#c026d3)] lg:flex lg:flex-col lg:justify-center lg:p-12">
        <div className="absolute -right-20 -top-20 size-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 -left-16 size-72 rounded-full bg-white/10" />
        <div className="relative text-primary-foreground">
          <BrandMark className="mb-8 size-16 rounded-2xl shadow-lg" />
          <h2 className="text-3xl font-bold leading-tight">
            O'qishingizni bir joyda boshqaring.
          </h2>
          <p className="mt-3 max-w-md text-primary-foreground/80">
            Dars jadvali, vazifalar, imtihonlar, xarajatlar va maqsadlaringiz —
            barchasi bitta premium platformada.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex items-center gap-3">
              <Sparkles className="size-5" /> Smart rejalashtirish va eslatmalar
            </li>
            <li className="flex items-center gap-3">
              <TrendingUp className="size-5" /> O'qish statistikasi va tahlillar
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="size-5" /> Xavfsiz va ishonchli saqlash
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
