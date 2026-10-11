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
import { saveGrade } from "@/features/gpa/actions";
import {
  gradeSchema,
  GRADE_OPTIONS,
  type GradeInput,
} from "@/features/gpa/schema";

export interface GradeItem {
  id: string;
  subjectName: string;
  credit: number;
  grade: string;
  semesterId: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: GradeItem | null;
  semesters: { id: string; name: string }[];
  defaultSemesterId?: string | null;
}

export function GradeFormDialog({
  open,
  onOpenChange,
  initial,
  semesters,
  defaultSemesterId,
}: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GradeInput>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      subjectName: "",
      credit: 3,
      grade: GRADE_OPTIONS[0],
      semesterId: null,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    reset(
      initial
        ? {
            id: initial.id,
            subjectName: initial.subjectName,
            credit: initial.credit,
            grade: gradeSchema.shape.grade.safeParse(initial.grade).data ?? GRADE_OPTIONS[0],
            semesterId: initial.semesterId,
          }
        : {
            subjectName: "",
            credit: 3,
            grade: GRADE_OPTIONS[0],
            semesterId: defaultSemesterId ?? null,
          }
    );
  }, [open, initial, reset, defaultSemesterId]);

  const grade = watch("grade");
  const semesterId = watch("semesterId");

  async function onSubmit(values: GradeInput) {
    const result = await saveGrade(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(initial ? "Baho yangilandi" : "Baho qo'shildi");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Bahoni tahrirlash" : "Yangi baho"}
          </DialogTitle>
          <DialogDescription>Baho ma'lumotlarini kiriting.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subjectName">Fan nomi</Label>
            <Input
              id="subjectName"
              {...register("subjectName")}
              placeholder="Matematika"
            />
            {errors.subjectName && (
              <p className="text-xs text-destructive">
                {errors.subjectName.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="credit">Kredit</Label>
              <Input
                id="credit"
                type="number"
                min={0}
                step={0.5}
                {...register("credit", { valueAsNumber: true })}
              />
              {errors.credit && (
                <p className="text-xs text-destructive">
                  {errors.credit.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Baho</Label>
              <Select
                value={grade}
                onValueChange={(value) => {
                  const parsed = gradeSchema.shape.grade.safeParse(value);
                  if (parsed.success) setValue("grade", parsed.data);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Baho tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.grade && (
                <p className="text-xs text-destructive">
                  {errors.grade.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Semestr</Label>
            <Select
              value={semesterId ?? "none"}
              onValueChange={(value) =>
                setValue("semesterId", value === "none" ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Semestr tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanlanmagan</SelectItem>
                {semesters.map((semester) => (
                  <SelectItem key={semester.id} value={semester.id}>
                    {semester.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
