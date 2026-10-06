"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
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
import type { SearchGroups } from "@/features/search/queries";

interface Props {
  query: string;
  groups: SearchGroups;
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
];

export function SearchView({ query, groups }: Props) {
  const router = useRouter();
  const [value, setValue] = React.useState(query);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    setValue(query);
  }, [query]);

  React.useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === query.trim()) return;

    setSearching(true);
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (trimmed) params.set("q", trimmed);
      const qs = params.toString();
      router.push(qs ? `/search?${qs}` : "/search");
    }, 300);

    return () => clearTimeout(handle);
  }, [value, query, router]);

  React.useEffect(() => {
    setSearching(false);
  }, [query]);

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
      ) : total === 0 ? (
        <EmptyState
          icon={Search}
          title="Natija topilmadi"
          description={`"${query}" bo'yicha hech narsa topilmadi.`}
        />
      ) : (
        <div className="space-y-6">
          {SECTIONS.map((section) => {
            const items = groups[section.key];
            if (items.length === 0) return null;
            const Icon = section.icon;
            return (
              <section key={section.key} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="size-4 text-muted-foreground" />
                  <span>{section.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {items.length}
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
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
