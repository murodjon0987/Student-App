"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
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
import { SUBJECT_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { saveGoal } from "@/features/goals/actions";
import { goalSchema, type GoalInput } from "@/features/goals/schema";

export interface GoalItem {
  id: string;
  title: string;
  description: string | null;
  targetDate: Date | string | null;
  color: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: GoalItem | null;
}

function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  return format(new Date(value), "yyyy-MM-dd");
}

export function GoalFormDialog({ open, onOpenChange, initial }: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: "",
      description: "",
      targetDate: "",
      color: SUBJECT_COLORS[0],
    },
  });

  React.useEffect(() => {
    if (!open) return;
    reset(
      initial
        ? {
            id: initial.id,
            title: initial.title,
            description: initial.description ?? "",
            targetDate: toDateInput(initial.targetDate),
            color: initial.color,
          }
        : {
            title: "",
            description: "",
            targetDate: "",
            color: SUBJECT_COLORS[0],
          }
    );
  }, [open, initial, reset]);

  const color = watch("color");

  async function onSubmit(values: GoalInput) {
    const result = await saveGoal(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(initial ? "Maqsad yangilandi" : "Maqsad qo'shildi");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Maqsadni tahrirlash" : "Yangi maqsad"}
          </DialogTitle>
          <DialogDescription>Maqsad ma'lumotlarini kiriting.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nomi</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="IELTS 7.0 olish"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Tavsif</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Maqsad haqida..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">Maqsad sanasi</Label>
            <Input id="targetDate" type="date" {...register("targetDate")} />
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
