"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, MapPin, User, Clock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ScheduleFormDialog,
  type ScheduleItem,
} from "@/features/schedule/components/schedule-form-dialog";
import { deleteSchedule } from "@/features/schedule/actions";
import { cn } from "@/lib/utils";

interface Props {
  schedule: ScheduleItem[];
  subjects: { id: string; name: string }[];
}

function currentWeekday() {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

export function ScheduleView({ schedule, subjects }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ScheduleItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ScheduleItem | null>(
    null
  );

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(item: ScheduleItem) {
    setEditing(item);
    setOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await deleteSchedule(deleteTarget.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Dars o'chirildi");
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dars jadvali"
        description="Haftalik darslaringizni boshqaring."
      >
        <Button variant="outline" asChild><Link href="/schedule/import">Jadval importi</Link></Button>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Dars qo'shish
        </Button>
      </PageHeader>

      {schedule.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Darslar yo'q"
          description="Birinchi darsingizni qo'shib jadvalni boshlang."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Dars qo'shish
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const items = schedule.filter((s) => s.dayOfWeek === day);
            const isToday = currentWeekday() === day;
            return (
              <div
                key={day}
                className={cn(
                  "rounded-xl border p-3",
                  isToday ? "border-primary/40 bg-primary/5" : "border-border"
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"][day - 1]}
                  </span>
                  {isToday && <Badge variant="default">Bugun</Badge>}
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Dars yo'q
                    </p>
                  )}
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => openEdit(item)}
                      className="w-full rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:border-primary/40"
                      style={{ borderLeft: `3px solid ${item.color}` }}
                    >
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {item.startTime}–{item.endTime}
                      </p>
                      {item.room && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          {item.room}
                        </p>
                      )}
                      {item.teacher && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="size-3" />
                          {item.teacher}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ScheduleFormDialog
        open={open}
        onOpenChange={setOpen}
        subjects={subjects}
        initial={editing}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Darsni o'chirish</DialogTitle>
            <DialogDescription>
              "{deleteTarget?.title}" darsini o'chirmoqchimisiz? Bu amalni qaytarib
              bo'lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Bekor qilish
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="size-4" /> O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
