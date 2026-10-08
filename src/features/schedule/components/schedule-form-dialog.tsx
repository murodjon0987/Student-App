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
import { SUBJECT_COLORS } from "@/lib/constants";
import { WEEKDAYS_UZ } from "@/lib/format";
import { cn } from "@/lib/utils";
import { saveSchedule } from "@/features/schedule/actions";
import {
  scheduleSchema,
  type ScheduleInput,
} from "@/features/schedule/schema";

export interface ScheduleItem {
  id: string;
  title: string;
  subjectId: string | null;
  teacher: string | null;
  room: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  color: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: { id: string; name: string }[];
  initial?: ScheduleItem | null;
  defaultDay?: number;
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  subjects,
  initial,
  defaultDay,
}: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleInput>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      title: "",
      subjectId: null,
      teacher: "",
      room: "",
      dayOfWeek: defaultDay ?? 1,
      startTime: "09:00",
      endTime: "10:30",
      color: SUBJECT_COLORS[0],
    },
  });

  React.useEffect(() => {
    if (open) {
      reset(
        initial
          ? {
              id: initial.id,
              title: initial.title,
              subjectId: initial.subjectId,
              teacher: initial.teacher ?? "",
              room: initial.room ?? "",
              dayOfWeek: initial.dayOfWeek,
              startTime: initial.startTime,
              endTime: initial.endTime,
              color: initial.color,
            }
          : {
              title: "",
              subjectId: null,
              teacher: "",
              room: "",
              dayOfWeek: defaultDay ?? 1,
              startTime: "09:00",
              endTime: "10:30",
              color: SUBJECT_COLORS[0],
            }
      );
    }
  }, [open, initial, defaultDay, reset]);

  const color = watch("color");
  const dayOfWeek = watch("dayOfWeek");
  const subjectId = watch("subjectId");

  async function onSubmit(values: ScheduleInput) {
    const result = await saveSchedule(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(initial ? "Dars yangilandi" : "Dars qo'shildi");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Darsni tahrirlash" : "Yangi dars"}</DialogTitle>
          <DialogDescription>
            Dars ma'lumotlarini to'ldiring.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Dars nomi</Label>
            <Input id="title" {...register("title")} placeholder="Matematika" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fan</Label>
              <Select
                value={subjectId ?? "none"}
                onValueChange={(value) =>
                  setValue("subjectId", value === "none" ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Fan tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanlanmagan</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hafta kuni</Label>
              <Select
                value={String(dayOfWeek)}
                onValueChange={(value) => setValue("dayOfWeek", Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS_UZ.map((day, index) => (
                    <SelectItem key={day} value={String(index + 1)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">Boshlanish</Label>
              <Input id="startTime" type="time" {...register("startTime")} />
              {errors.startTime && (
                <p className="text-xs text-destructive">
                  {errors.startTime.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">Tugash</Label>
              <Input id="endTime" type="time" {...register("endTime")} />
              {errors.endTime && (
                <p className="text-xs text-destructive">
                  {errors.endTime.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacher">O'qituvchi</Label>
              <Input id="teacher" {...register("teacher")} placeholder="A. Karimov" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="room">Xona</Label>
              <Input id="room" {...register("room")} placeholder="201-xona" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rang</Label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue("color", value)}
                  className={cn(
                    "size-9 rounded-full ring-offset-2 ring-offset-background transition-all",
                    color === value && "ring-2 ring-ring"
                  )}
                  style={{ backgroundColor: value }}
                  aria-label={value}
                />
              ))}
            </div>
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
