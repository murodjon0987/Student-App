"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate } from "@/lib/format";
import { deleteSemester, saveSemester } from "@/features/gpa/actions";
import type { SemesterInput } from "@/features/gpa/schema";

export interface SemesterItem {
  id: string;
  name: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semesters: SemesterItem[];
}

const EMPTY: SemesterInput = { name: "", startDate: "", endDate: "" };

export function SemesterManagerDialog({ open, onOpenChange, semesters }: Props) {
  const router = useRouter();
  const [values, setValues] = React.useState<SemesterInput>(EMPTY);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) setValues(EMPTY);
  }, [open]);

  function update(name: keyof SemesterInput, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await saveSemester(values);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Semestr qo'shildi");
    setValues(EMPTY);
    router.refresh();
  }

  async function remove(id: string) {
    const result = await deleteSemester(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Semestr o'chirildi");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Semestrlar</DialogTitle>
          <DialogDescription>
            Baholarni semestrlarga bo'lib, akademik tarixni yuriting.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3 rounded-lg border border-border p-3">
          <div className="space-y-2">
            <Label htmlFor="semester-name">Nomi</Label>
            <Input
              id="semester-name"
              value={values.name ?? ""}
              onChange={(event) => update("name", event.target.value)}
              placeholder="2026/2027 — 1-semestr"
              maxLength={60}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="semester-start">Boshlanish</Label>
              <Input
                id="semester-start"
                type="date"
                value={values.startDate ?? ""}
                onChange={(event) => update("startDate", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester-end">Tugash</Label>
              <Input
                id="semester-end"
                type="date"
                value={values.endDate ?? ""}
                onChange={(event) => update("endDate", event.target.value)}
              />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={busy || !values.name?.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Qo'shish
          </Button>
        </form>

        {semesters.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Hali semestr qo'shilmagan.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {semesters.map((semester) => (
              <li
                key={semester.id}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
              >
                <CalendarRange className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{semester.name}</p>
                  {(semester.startDate || semester.endDate) && (
                    <p className="text-xs text-muted-foreground">
                      {semester.startDate ? formatDate(semester.startDate) : "—"}
                      {" – "}
                      {semester.endDate ? formatDate(semester.endDate) : "—"}
                    </p>
                  )}
                </div>
                <ConfirmDialog
                  title="Semestrni o'chirish"
                  description={`"${semester.name}" o'chiriladi. Baholar saqlanib qoladi.`}
                  onConfirm={() => remove(semester.id)}
                  trigger={
                    <Button type="button" variant="ghost" size="icon-sm">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
