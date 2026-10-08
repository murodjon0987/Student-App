"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EVENT_TYPES } from "@/lib/constants";
import { MONTHS_UZ, WEEKDAYS_UZ, formatUzFullDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteEvent } from "@/features/calendar/actions";
import { EventFormDialog } from "@/features/calendar/components/event-form-dialog";
import type { CalendarData, CalendarItem } from "@/features/calendar/queries";

interface Props {
  data: CalendarData;
}

const MAX_CHIPS = 3;

function keyOf(value: Date | string) {
  return format(new Date(value), "yyyy-MM-dd");
}

export function CalendarView({ data }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [selected, setSelected] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [defaultDate, setDefaultDate] = React.useState<string | undefined>();

  const [year, monthNumber] = data.month.split("-").map(Number);
  const monthIndex = monthNumber - 1;
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const cells = React.useMemo(
    () =>
      Array.from({ length: totalCells }, (_, index) => {
        const dayNumber = index - firstWeekday + 1;
        if (dayNumber < 1 || dayNumber > daysInMonth) return null;
        const date = new Date(year, monthIndex, dayNumber);
        return { dayNumber, key: keyOf(date) };
      }),
    [totalCells, firstWeekday, daysInMonth, year, monthIndex]
  );

  const grouped = React.useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of data.items) {
      const itemKey = keyOf(item.date);
      const list = map.get(itemKey) ?? [];
      list.push(item);
      map.set(itemKey, list);
    }
    return map;
  }, [data.items]);

  React.useEffect(() => {
    const now = new Date();
    setSelected(
      now.getFullYear() === year && now.getMonth() === monthIndex
        ? keyOf(now)
        : null
    );
  }, [year, monthIndex]);

  const todayKey = keyOf(new Date());
  const selectedItems = selected ? grouped.get(selected) ?? [] : [];

  function shiftMonth(delta: number) {
    const next = new Date(year, monthIndex + delta, 1);
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    startTransition(() => router.push(`/calendar?month=${key}`));
  }

  function openCreate(date?: string) {
    setDefaultDate(date);
    setFormOpen(true);
  }

  async function handleDelete(item: CalendarItem) {
    if (!item.id.startsWith("event-")) return;
    const result = await deleteEvent(item.id.slice("event-".length));
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Tadbir o'chirildi");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kalendar"
        description="Darslar, imtihonlar, deadline va maqsadlar bir joyda."
      >
        <Button onClick={() => openCreate(selected ?? undefined)}>
          <Plus className="size-4" /> Tadbir qo'shish
        </Button>
      </PageHeader>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => shiftMonth(-1)}
          disabled={isPending}
          aria-label="Oldingi oy"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="flex items-center gap-2 text-sm font-medium capitalize">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {MONTHS_UZ[monthIndex]} {year}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => shiftMonth(1)}
          disabled={isPending}
          aria-label="Keyingi oy"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
          <div className="min-w-[640px] sm:min-w-0">
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS_UZ.map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-center text-[11px] font-semibold uppercase text-muted-foreground"
              >
                {day.slice(0, 3)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((cell, index) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-24 border-b border-r border-border bg-muted/20 last:border-r-0"
                  />
                );
              }

              const items = grouped.get(cell.key) ?? [];
              const isToday = cell.key === todayKey;
              const isSelected = cell.key === selected;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelected(cell.key)}
                  className={cn(
                    "min-h-24 border-b border-r border-border p-1.5 text-left align-top transition-colors hover:bg-accent/40",
                    isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/40"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground"
                      )}
                    >
                      {cell.dayNumber}
                    </span>
                    {items.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {items.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {items.slice(0, MAX_CHIPS).map((item) => (
                      <span
                        key={item.id}
                        className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight"
                        style={{ backgroundColor: `${item.color}1a` }}
                      >
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate text-foreground">
                          {item.title}
                        </span>
                      </span>
                    ))}
                    {items.length > MAX_CHIPS && (
                      <span className="block px-1 text-[10px] text-muted-foreground">
                        +{items.length - MAX_CHIPS} yana
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">
                {selected ? formatUzFullDate(selected) : "Kun tanlanmagan"}
              </h2>
              {selected && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openCreate(selected)}
                  aria-label="Tadbir qo'shish"
                >
                  <Plus className="size-4" />
                </Button>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {selectedItems.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Tadbir yo'q"
                  description="Bu kunda hech narsa rejalashtirilmagan."
                />
              ) : (
                selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-start gap-2 rounded-lg border border-border p-2.5"
                  >
                    <span
                      className="mt-0.5 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="min-w-0 flex-1">
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="line-clamp-1 text-sm font-medium hover:underline"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <p className="line-clamp-1 text-sm font-medium">
                          {item.title}
                        </p>
                      )}
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {EVENT_TYPES.find((t) => t.value === item.type)
                            ?.label ?? item.type}
                        </span>
                        {item.time && <span>{item.time}</span>}
                      </p>
                    </div>
                    {item.id.startsWith("event-") && (
                      <ConfirmDialog
                        title="Tadbirni o'chirish"
                        description={`"${item.title}" o'chiriladi.`}
                        onConfirm={() => handleDelete(item)}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                            aria-label="O'chirish"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        }
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Belgilar</h2>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map((type) => (
                <div key={type.value} className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="truncate text-xs text-muted-foreground">
                    {type.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultDate={defaultDate}
      />
    </div>
  );
}
