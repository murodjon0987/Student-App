"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATTENDANCE_LABELS, ATTENDANCE_STATUSES } from "@/lib/constants";
import { localDateKey } from "@/lib/date";
import { saveAttendance } from "@/features/attendance/actions";
import {
  attendanceSchema,
  type AttendanceInput,
} from "@/features/attendance/schema";

export interface AttendanceItem {
  id: string;
  subjectId: string | null;
  scheduleId: string | null;
  date: Date | string;
  status: string;
  note: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: { id: string; name: string }[];
  schedules: {
    id: string;
    title: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    subjectId: string | null;
  }[];
  initial?: AttendanceItem | null;
}

const DAY_LABELS = ["", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan", "Yak"];

function toDateInput(value: Date | string | null | undefined) {
  if (!value) return localDateKey();
  return localDateKey(value);
}

export function AttendanceFormDialog({
  open,
  onOpenChange,
  subjects,
  schedules,
  initial,
}: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AttendanceInput>({
    resolver: zodResolver(attendanceSchema),
  });

  React.useEffect(() => {
    if (!open) return;
    reset(
      initial
        ? {
            id: initial.id,
            date: toDateInput(initial.date),
            subjectId: initial.subjectId,
            scheduleId: initial.scheduleId,
            status: initial.status as AttendanceInput["status"],
            note: initial.note ?? "",
          }
        : {
            date: localDateKey(),
            subjectId: null,
            scheduleId: null,
            status: "PRESENT",
            note: "",
          }
    );
  }, [open, initial, reset]);

  const subjectId = watch("subjectId");
  const scheduleId = watch("scheduleId");
  const status = watch("status");

  const visibleSchedules = subjectId
    ? schedules.filter((s) => s.subjectId === subjectId || s.subjectId === null)
    : schedules;

  async function onSubmit(values: AttendanceInput) {
    const result = await saveAttendance(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(initial ? "Yozuv yangilandi" : "Davomat qayd etildi");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Davomatni tahrirlash" : "Davomat qayd etish"}
          </DialogTitle>
          <DialogDescription>
            Darsga qatnashish holatini belgilang.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Sana</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Holat</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setValue("status", v as AttendanceInput["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ATTENDANCE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fan</Label>
              <Select
                value={subjectId ?? "none"}
                onValueChange={(v) => {
                  setValue("subjectId", v === "none" ? null : v);
                  setValue("scheduleId", null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Fan tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanlanmagan</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dars (ixtiyoriy)</Label>
              <Select
                value={scheduleId ?? "none"}
                onValueChange={(v) =>
                  setValue("scheduleId", v === "none" ? null : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Darsni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanlanmagan</SelectItem>
                  {visibleSchedules.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {DAY_LABELS[s.dayOfWeek]} {s.startTime} · {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Izoh</Label>
            <Input
              id="note"
              {...register("note")}
              placeholder="Ixtiyoriy izoh..."
            />
            {errors.note && (
              <p className="text-xs text-destructive">{errors.note.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
