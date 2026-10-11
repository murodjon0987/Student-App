"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDate } from "@/lib/format";
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
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveExam } from "@/features/exams/actions";
import { examSchema, type ExamInput } from "@/features/exams/schema";

export interface ExamItem {
  id: string;
  title: string;
  subjectId: string | null;
  date: Date | string;
  time: string | null;
  room: string | null;
  description: string | null;
  prepProgress: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: { id: string; name: string }[];
  initial?: ExamItem | null;
}

function toLocalInput(value: Date | string | null | undefined) {
  if (!value) return "";
  return formatDate(value, "yyyy-MM-dd'T'HH:mm");
}

export function ExamFormDialog({
  open,
  onOpenChange,
  subjects,
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
  } = useForm<ExamInput>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: "",
      subjectId: null,
      date: "",
      time: "",
      room: "",
      description: "",
      prepProgress: 0,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    reset(
      initial
        ? {
            id: initial.id,
            title: initial.title,
            subjectId: initial.subjectId,
            date: toLocalInput(initial.date),
            time: initial.time ?? "",
            room: initial.room ?? "",
            description: initial.description ?? "",
            prepProgress: initial.prepProgress,
          }
        : {
            title: "",
            subjectId: null,
            date: "",
            time: "",
            room: "",
            description: "",
            prepProgress: 0,
          }
    );
  }, [open, initial, reset]);

  const subjectId = watch("subjectId");

  async function onSubmit(values: ExamInput) {
    const result = await saveExam(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(initial ? "Imtihon yangilandi" : "Imtihon qo'shildi");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Imtihonni tahrirlash" : "Yangi imtihon"}
          </DialogTitle>
          <DialogDescription>Imtihon ma'lumotlarini kiriting.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nomi</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Matematika imtihoni"
            />
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
              <Label htmlFor="date">Sana</Label>
              <Input id="date" type="datetime-local" {...register("date")} />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Vaqt</Label>
              <Input id="time" type="time" {...register("time")} />
              {errors.time && (
                <p className="text-xs text-destructive">{errors.time.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="room">Xona</Label>
              <Input id="room" {...register("room")} placeholder="201-xona" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prepProgress">Tayyorgarlik (%)</Label>
              <Input
                id="prepProgress"
                type="number"
                min={0}
                max={100}
                {...register("prepProgress", { valueAsNumber: true })}
              />
              {errors.prepProgress && (
                <p className="text-xs text-destructive">
                  {errors.prepProgress.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Tavsif</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Qo'shimcha ma'lumot..."
            />
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
