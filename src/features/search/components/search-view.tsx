"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Bus,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  Loader2,
  Search,
  StickyNote,
  Target,
  type LucideIcon,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import type { SearchGroups, SearchPages } from "@/features/search/queries";

interface Props {
  query: string;
  groups: SearchGroups;
  pages: SearchPages;
}

const SECTIONS: {
  key: keyof SearchGroups;
  label: string;
  icon: LucideIcon;
}[] = [
  { key: "notes", label: "Eslatmalar", icon: StickyNote },
  { key: "tasks", label: "Todo", icon: CheckSquare },
  { key: "homework", label: "Uy vazifalari", icon: ClipboardList },
  { key: "exams", label: "Imtihonlar", icon: GraduationCap },
  { key: "materials", label: "Materiallar", icon: FolderOpen },
  { key: "events", label: "Tadbirlar", icon: CalendarDays },
  { key: "goals", label: "Maqsadlar", icon: Target },
  { key: "subjects", label: "Fanlar", icon: BookOpen },
  { key: "transit", label: "Transport", icon: Bus },
  { key: "decks", label: "Test va kartochkalar", icon: BookOpen },
  { key: "plans", label: "Tayyorgarlik rejalari", icon: CalendarDays },
  { key: "questions", label: "Guruh savollari", icon: GraduationCap },
  { key: "opportunities", label: "Imkoniyatlar", icon: Target },
];

export function SearchView({ query, groups, pages }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = React.useState(query);
  const [searching, startTransition] = React.useTransition();

  React.useEffect(() => {
    setValue(query);
  }, [query]);

  React.useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === query.trim()) return;

    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (trimmed) params.set("q", trimmed);
      const qs = params.toString();
      startTransition(() => router.replace(qs ? `/search?${qs}` : "/search", { scroll: false }));
    }, 300);

    return () => clearTimeout(handle);
  }, [value, query, router]);

  function pageLink(key: keyof SearchGroups, page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) params.set(`${key}Page`, String(page));
    else params.delete(`${key}Page`);
    return `/search?${params}#${key}`;
  }

  const total = SECTIONS.reduce(
    (sum, section) => sum + groups[section.key].length,
    0
  );
  const active = query.trim().length >= 2;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Qidiruv"
        description="Eslatmalar, vazifalar, imtihonlar va boshqalardan qidiring."
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          aria-label="Barcha bo'limlarda qidirish"
          maxLength={200}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Kamida 2 ta belgi kiriting..."
          className="h-11 pl-9 pr-10"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {!active ? (
        <EmptyState
          icon={Search}
          title="Qidiruvni boshlang"
          description="Qidirish uchun kamida 2 ta belgi kiriting."
        />
      ) : total === 0 && !Object.values(pages).some((page) => page.page > 1) ? (
        <EmptyState
          icon={Search}
          title="Natija topilmadi"
          description={`"${query}" bo'yicha hech narsa topilmadi.`}
        />
      ) : (
        <div className="space-y-6">
          {SECTIONS.map((section) => {
            const items = groups[section.key];
            const page = pages[section.key];
            if (items.length === 0 && page.page === 1) return null;
            const Icon = section.icon;
            return (
              <section id={section.key} key={section.key} className="scroll-mt-20 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="size-4 text-muted-foreground" />
                  <span>{section.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {page.page}-sahifa · {items.length} ta
                  </span>
                </div>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={cn(
                        "block rounded-xl border border-border bg-card p-3 transition-colors",
                        "hover:border-primary/30 hover:bg-accent/40"
                      )}
                    >
                      <p className="truncate text-sm font-medium">
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {item.subtitle}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
                {items.length === 0 && <p className="text-sm text-muted-foreground">Bu sahifada natija yo'q. Oldingi sahifaga qayting.</p>}
                <nav aria-label={`${section.label} qidiruv sahifalari`} className="flex gap-4 text-sm text-primary">
                  {page.page > 1 && <Link href={pageLink(section.key, page.page - 1)}>Oldingi</Link>}
                  {page.hasMore && <Link href={pageLink(section.key, page.page + 1)}>Keyingi</Link>}
                </nav>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
