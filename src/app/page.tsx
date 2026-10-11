import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarDays, CheckSquare, Sparkles, Timer, Wallet } from "lucide-react";
import { BrandMark } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { EntryGate } from "@/features/onboarding/components/entry-gate";

import { getAuthenticatedSession } from "@/lib/auth/session";

export default async function Home() {
  // The public introduction stays available even during a database outage.
  // Protected pages still require a successful database session verification.
  const session = await getAuthenticatedSession().catch(() => null);
  if (session?.userId) redirect("/dashboard");
  const features = [
    { icon: CalendarDays, title: "Darslar va imtihonlar", text: "Jadval, kalendar va tayyorgarlik rejalari bilan muhim sanalarni kuzating." },
    { icon: CheckSquare, title: "Vazifalar va eslatmalar", text: "Uy vazifalari, shaxsiy rejalar va yozuvlarni bir joyda saqlang." },
    { icon: Timer, title: "Diqqatni jamlash", text: "Fokus taymeri bilan o'qing va o'qishga sarflagan vaqtingizni kuzating." },
    { icon: Wallet, title: "Talaba budjeti", text: "Oylik limit belgilang, xarajatlarni kiriting va qolgan mablag'ni ko'ring." },
    { icon: BookOpenCheck, title: "Test va kartochkalar", text: "Mavzularni kartochkalar va testlar yordamida takrorlang." },
    { icon: Sparkles, title: "AI yordamchi", text: "O'qish bo'yicha savollar bering va tushunmagan mavzularingizni o'rganing." },
  ];
  return (
    <EntryGate>
      <div className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold"><BrandMark /> Student App</Link>
        <nav aria-label="Asosiy menyu" className="flex items-center gap-2"><ThemeToggle /><Link href="/login" className={buttonVariants({ variant: "outline" })}>Kirish</Link></nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="py-16 sm:py-24">
          <p className="mb-5 text-sm font-semibold text-primary">Talabalik hayotingiz uchun</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">O'qish, vaqt va rejalar — bir joyda.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">Student App dars jadvali, vazifalar, imtihonlar va xarajatlarni tartibga solishga yordam beradi. Kuningizni rejalashtiring va o'z natijalaringizni kuzating.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className={buttonVariants({ size: "lg" })}>Ro'yxatdan o'tish <ArrowRight className="size-4" /></Link><a href="#imkoniyatlar" className={buttonVariants({ variant: "outline", size: "lg" })}>Imkoniyatlarni ko'rish</a></div>
        </section>
        <section id="imkoniyatlar" className="scroll-mt-6 pb-16">
          <h2 className="mb-8 text-2xl font-semibold">Kundalik o'qishga kerakli vositalar</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border bg-card p-6"><Icon className="mb-4 size-6 text-primary" /><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div>
        </section>
        <section className="mb-16 rounded-2xl bg-primary/10 p-6 sm:p-10"><h2 className="text-2xl font-semibold">Birinchi kuningizni rejalashtiring</h2><p className="mt-3 max-w-xl text-muted-foreground">Hisob yarating, fanlaringizni kiriting va dars jadvalingizni qo'shing. Keyin vazifalarni rejalashtirish va o'qish natijalarini kuzatishni boshlang.</p><Link href="/register" className={`${buttonVariants()} mt-6`}>Boshlash <ArrowRight className="size-4" /></Link></section>
      </main>
      <footer className="border-t px-4 py-6 text-center text-sm text-muted-foreground">Student App · Talabalar uchun kundalik yordamchi</footer>
      </div>
    </EntryGate>
  );
}
