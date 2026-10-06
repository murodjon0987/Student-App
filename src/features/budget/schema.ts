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
  date: z.string().min(1, { error: "Sanani tanlang" }),
});

export const budgetSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, { error: "Oyni tanlang (YYYY-MM)" }),
  amount: z
    .number({ error: "Summani kiriting" })
    .min(0, { error: "Summa manfiy bo'lishi mumkin emas" }),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
