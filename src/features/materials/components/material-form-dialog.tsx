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
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MATERIAL_CATEGORIES } from "@/lib/constants";
import { AttachmentManager } from "@/features/attachments/components/attachment-manager";
import { saveMaterial } from "@/features/materials/actions";
import {
  materialSchema,
  type MaterialInput,
} from "@/features/materials/schema";

export interface MaterialItem {
  id: string;
  title: string;
  category: string;
  url: string | null;
  description: string | null;
  subjectId: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: { id: string; name: string }[];
  initial?: MaterialItem | null;
}

export function MaterialFormDialog({
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
  } = useForm<MaterialInput>({
    resolver: zodResolver(materialSchema),
  });

  React.useEffect(() => {
    if (!open) return;
    reset(
      initial
        ? {
            id: initial.id,
            title: initial.title,
            category: initial.category as MaterialInput["category"],
            url: initial.url ?? "",
            description: initial.description ?? "",
            subjectId: initial.subjectId,
          }
        : {
            title: "",
            category: "OTHER",
            url: "",
            description: "",
            subjectId: null,
          }
    );
  }, [open, initial, reset]);

  const subjectId = watch("subjectId");
  const category = watch("category");

  async function onSubmit(values: MaterialInput) {
    const result = await saveMaterial(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(initial ? "Material yangilandi" : "Material qo'shildi");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Materialni tahrirlash" : "Yangi material"}
          </DialogTitle>
          <DialogDescription>
            Material ma'lumotlarini kiriting.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nomi</Label>
            <Input id="title" {...register("title")} placeholder="Material nomi" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Kategoriya</Label>
              <Select
                value={category}
                onValueChange={(v) => setValue("category", v as MaterialInput["category"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Havola</Label>
            <Input
              id="url"
              {...register("url")}
              placeholder="https://..."
            />
            {errors.url && (
              <p className="text-xs text-destructive">{errors.url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Tavsif</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Qisqacha tavsif..."
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

        {initial?.id && (
          <AttachmentManager parent={{ materialId: initial.id }} />
        )}
      </DialogContent>
    </Dialog>
  );
}
