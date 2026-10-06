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
import { saveNote } from "@/features/notes/actions";
import { noteSchema, type NoteInput } from "@/features/notes/schema";

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  subjectId: string | null;
  tags: string[];
  updatedAt: Date | string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: { id: string; name: string }[];
  initial?: NoteItem | null;
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function NoteFormDialog({
  open,
  onOpenChange,
  subjects,
  initial,
}: Props) {
  const router = useRouter();
  const [tagsText, setTagsText] = React.useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NoteInput>({
    resolver: zodResolver(noteSchema),
  });

  React.useEffect(() => {
    if (!open) return;
    reset(
      initial
        ? {
            id: initial.id,
            title: initial.title,
            content: initial.content,
            subjectId: initial.subjectId,
            tags: initial.tags,
          }
        : {
            title: "",
            content: "",
            subjectId: null,
            tags: [],
          }
    );
    setTagsText(initial ? initial.tags.join(", ") : "");
  }, [open, initial, reset]);

  const subjectId = watch("subjectId");

  async function onSubmit(values: NoteInput) {
    const result = await saveNote({ ...values, tags: parseTags(tagsText) });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(initial ? "Eslatma yangilandi" : "Eslatma qo'shildi");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Eslatmani tahrirlash" : "Yangi eslatma"}
          </DialogTitle>
          <DialogDescription>Eslatma ma'lumotlarini kiriting.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nomi</Label>
            <Input id="title" {...register("title")} placeholder="Eslatma nomi" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
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
              <Label htmlFor="tags">Teglar</Label>
              <Input
                id="tags"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="algoritm, imtihon"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Matn</Label>
            <Textarea
              id="content"
              {...register("content")}
              placeholder="Eslatma matni..."
              className="min-h-[160px]"
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
