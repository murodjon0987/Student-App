import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { queryPage, type ListParams } from "@/lib/pagination";
import { monthKey, monthRange } from "@/lib/date";

const MONTH_REGEX = /^(?:19\d{2}|[2-9]\d{3})-(?:0[1-9]|1[0-2])$/;

export function currentMonthKey(date = new Date()) {
  return monthKey(date);
}

export async function getBudgetData(month?: string, params: ListParams = {}) {
  const { userId } = await verifySession();

  const target = month && MONTH_REGEX.test(month) ? month : currentMonthKey();
  const { start, end } = monthRange(target);

  const where = { userId, date: { gte: start, lte: end } };
  const [budget, result, categoryTotals, profile] = await Promise.all([
    prisma.budget.findUnique({
      where: { userId_month: { userId, month: target } },
    }),
    queryPage(params.page, () => prisma.expense.count({ where }),
      (range) => prisma.expense.findMany({ where, ...range, orderBy: [{ date: "desc" }, { id: "desc" }] })),
    prisma.expense.groupBy({ by: ["category"], where, _sum: { amount: true } }),
    prisma.studentProfile.findUnique({ where: { userId }, select: { monthlyBudget: true } }),
  ]);

  const total = categoryTotals.reduce((sum, group) => sum + (group._sum.amount ?? 0), 0);
  const totalsByCategory = new Map(categoryTotals.map((group) => [group.category, group._sum.amount ?? 0]));

  const byCategory = EXPENSE_CATEGORIES.map((category) => ({
    category: category.value,
    label: category.label,
    color: category.color,
    amount: totalsByCategory.get(category.value) ?? 0,
  })).filter((category) => category.amount > 0);

  return {
    month: target,
    budget: budget?.amount ?? profile?.monthlyBudget ?? 0,
    expenses: result.items,
    pagination: result.pagination,
    total,
    byCategory,
  };
}

export type BudgetData = Awaited<ReturnType<typeof getBudgetData>>;
