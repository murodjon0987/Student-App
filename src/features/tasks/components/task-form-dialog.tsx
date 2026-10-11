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
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { saveTask } from "@/features/tasks/actions";
import { taskSchema, type TaskInput } from "@/features/tasks/schema";

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  subjectId: string | null;
  priority: string;
  status: string;
  category: string | null;
  deadline: Date | string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: { id: string; name: string }[];
  initial?: TaskItem | null;
}

function toLocalInput(value: Date | string | null | undefined) {
  if (!value) return "";
  return formatDate(value, "yyyy-MM-dd'T'HH:mm");
}

export function TaskFormDialog({
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
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
  });

  React.useEffect(() => {
    if (!open) return;
    reset(
      initial
        ? {
            id: initial.id,
            title: initial.title,
            description: initial.description ?? "",
            subjectId: initial.subjectId,
            priority: initial.priority as TaskInput["priority"],
            status: initial.status as TaskInput["status"],
            category: initial.category ?? "",
            deadline: toLocalInput(initial.deadline),
          }
        : {
            title: "",
            description: "",
            subjectId: null,
            priority: "MEDIUM",
            status: "PENDING",
            category: "",
            deadline: "",
          }
    );
  }, [open, initial, reset]);

  const subjectId = watch("subjectId");
  const priority = watch("priority");
  const status = watch("status");

  async function onSubmit(values: TaskInput) {
    const result = await saveTask(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(initial ? "Vazifa yangilandi" : "Vazifa qo'shildi");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Vazifani tahrirlash" : "Yangi vazifa"}
          </DialogTitle>
          <DialogDescription>Vazifa ma'lumotlarini kiriting.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nomi</Label>
            <Input id="title" {...register("title")} placeholder="Vazifa nomi" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Tavsif</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Qo'shimcha ma'lumot..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fan</Label>
              <Select
                value={subjectId ?? "none"}
                onValueChange={(v) => setValue("subjectId", v === "none" ? null : v)}
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
              <Label htmlFor="category">Kategoriya</Label>
              <Input id="category" {...register("category")} placeholder="Shaxsiy" />
            </div>

            <div className="space-y-2">
              <Label>Muhimlik</Label>
              <Select
                value={priority}
                onValueChange={(v) => setValue("priority", v as TaskInput["priority"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["LOW", "MEDIUM", "HIGH"] as const).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Holat</Label>
              <Select
                value={status}
                onValueChange={(v) => setValue("status", v as TaskInput["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["PENDING", "IN_PROGRESS", "COMPLETED"] as const).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="datetime-local"
              {...register("deadline")}
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
