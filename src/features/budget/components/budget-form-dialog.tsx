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
import { setBudget } from "@/features/budget/actions";
import { budgetSchema, type BudgetInput } from "@/features/budget/schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  amount: number;
}

export function BudgetFormDialog({ open, onOpenChange, month, amount }: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
  });

  React.useEffect(() => {
    if (!open) return;
    reset({ month, amount });
  }, [open, month, amount, reset]);

  async function onSubmit(values: BudgetInput) {
    const result = await setBudget(values.month, values.amount);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Budjet saqlandi");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Oylik budjet</DialogTitle>
          <DialogDescription>
            Tanlangan oy uchun budjet miqdorini belgilang.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="month">Oy</Label>
            <Input id="month" type="month" {...register("month")} />
            {errors.month && (
              <p className="text-xs text-destructive">{errors.month.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-amount">Summa (so'm)</Label>
            <Input
              id="budget-amount"
              type="number"
              min={0}
              step="any"
              placeholder="0"
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
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
