import { z } from "zod";

import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/constants";

const EXPENSE_CATEGORY_VALUES = EXPENSE_CATEGORIES.map(
  (category) => category.value
) as [ExpenseCategory, ...ExpenseCategory[]];

export const expenseSchema = z.object({
  amount: z
    .number({ error: "Summani kiriting" })
    .gt(0, { error: "Summa 0 dan katta bo'lishi kerak" }),
  category: z.enum(EXPENSE_CATEGORY_VALUES, { error: "Kategoriyani tanlang" }),
  description: z.string().trim().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Sanani tanlang" }).refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, { error: "To'g'ri sanani kiriting" }),
});

export const budgetSchema = z.object({
  month: z
    .string()
    .regex(/^(?:19\d{2}|[2-9]\d{3})-(?:0[1-9]|1[0-2])$/, { error: "Oyni tanlang (YYYY-MM)" }),
  amount: z
    .number({ error: "Summani kiriting" })
    .min(0, { error: "Summa manfiy bo'lishi mumkin emas" }),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
