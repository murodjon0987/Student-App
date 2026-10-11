"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDate } from "@/lib/format";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { EVENT_TYPES, SUBJECT_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { saveEvent } from "@/features/calendar/actions";
import { eventSchema, type EventInput } from "@/features/calendar/schema";

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  start: Date | string;
  end: Date | string | null;
  allDay: boolean;
  color: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: EventItem | null;
  defaultDate?: string;
}

function toLocalInput(value: Date | string | null | undefined) {
  if (!value) return "";
  return formatDate(value, "yyyy-MM-dd'T'HH:mm");
}

export function EventFormDialog({
  open,
  onOpenChange,
  initial,
  defaultDate,
}: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "PERSONAL",
      start: "",
      end: "",
      allDay: false,
      color: EVENT_TYPES[5].color,
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
            type: initial.type as EventInput["type"],
            start: toLocalInput(initial.start),
            end: toLocalInput(initial.end),
            allDay: initial.allDay,
            color: initial.color,
          }
        : {
            title: "",
            description: "",
            type: "PERSONAL",
            start: defaultDate ? `${defaultDate}T09:00` : "",
            end: "",
            allDay: false,
            color: EVENT_TYPES[5].color,
          }
    );
  }, [open, initial, defaultDate, reset]);

  const type = watch("type");
  const color = watch("color");
  const allDay = watch("allDay");

  async function onSubmit(values: EventInput) {
    const result = await saveEvent(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(initial ? "Tadbir yangilandi" : "Tadbir qo'shildi");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Tadbirni tahrirlash" : "Yangi tadbir"}
          </DialogTitle>
          <DialogDescription>Tadbir ma'lumotlarini kiriting.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nomi</Label>
            <Input id="title" {...register("title")} placeholder="Tadbir nomi" />
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

          <div className="space-y-2">
            <Label>Turi</Label>
            <Select
              value={type}
              onValueChange={(value) => {
                setValue("type", value as EventInput["type"]);
                const match = EVENT_TYPES.find((item) => item.value === value);
                if (match) setValue("color", match.color);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Boshlanish</Label>
              <Input
                id="start"
                type="datetime-local"
                {...register("start")}
              />
              {errors.start && (
                <p className="text-xs text-destructive">
                  {errors.start.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end">Tugash</Label>
              <Input id="end" type="datetime-local" {...register("end")} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="allDay"
              checked={allDay}
              onCheckedChange={(checked) =>
                setValue("allDay", checked === true)
              }
            />
            <Label htmlFor="allDay" className="cursor-pointer">
              Kun bo'yi
            </Label>
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
