import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

const MONTH_REGEX = /^\d{4}-\d{2}$/;

export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function getBudgetData(month?: string) {
  const { userId } = await verifySession();

  const target = month && MONTH_REGEX.test(month) ? month : currentMonthKey();
  const [year, monthIndex] = target.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 0, 23, 59, 59, 999);

  const [budget, expenses] = await Promise.all([
    prisma.budget.findUnique({
      where: { userId_month: { userId, month: target } },
    }),
    prisma.expense.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { date: "desc" },
    }),
  ]);

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const totalsByCategory = new Map<string, number>();
  for (const expense of expenses) {
    totalsByCategory.set(
      expense.category,
      (totalsByCategory.get(expense.category) ?? 0) + expense.amount
    );
  }

  const byCategory = EXPENSE_CATEGORIES.map((category) => ({
    category: category.value,
    label: category.label,
    color: category.color,
    amount: totalsByCategory.get(category.value) ?? 0,
  })).filter((category) => category.amount > 0);

  return {
    month: target,
    budget: budget?.amount ?? 0,
    expenses,
    total,
    byCategory,
  };
}

export type BudgetData = Awaited<ReturnType<typeof getBudgetData>>;
