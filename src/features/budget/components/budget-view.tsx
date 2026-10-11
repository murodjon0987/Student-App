"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { appDateParts, localDateKey, shiftMonth as shiftedMonth } from "@/lib/date";
import {
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Plus,
  Trash2,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  expenseCategoryColor,
  expenseCategoryLabel,
} from "@/lib/constants";
import { formatCurrency, formatDate, MONTHS_UZ } from "@/lib/format";
import { percentage } from "@/lib/utils";
import { deleteExpense } from "@/features/budget/actions";
import { ExpenseFormDialog } from "@/features/budget/components/expense-form-dialog";
import { BudgetFormDialog } from "@/features/budget/components/budget-form-dialog";
import type { BudgetData } from "@/features/budget/queries";

interface Props {
  data: BudgetData;
}

function monthLabel(month: string) {
  const [year, index] = month.split("-").map(Number);
  return `${MONTHS_UZ[index - 1] ?? month} ${year}`;
}

function daysElapsed(month: string) {
  const [year, index] = month.split("-").map(Number);
  const now = appDateParts();
  const isCurrent = year === now.year && index === now.month + 1;
  return isCurrent ? now.day : new Date(Date.UTC(year, index, 0)).getUTCDate();
}

export function BudgetView({ data }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expenseOpen, setExpenseOpen] = React.useState(false);
  const [budgetOpen, setBudgetOpen] = React.useState(false);

  const remaining = Math.max(0, data.budget - data.total);
  const progress = percentage(data.total, data.budget);
  const average = data.total / Math.max(1, daysElapsed(data.month));

  const groups = React.useMemo(() => {
    const map = new Map<string, BudgetData["expenses"]>();
    for (const expense of data.expenses) {
      const key = localDateKey(expense.date);
      const list = map.get(key) ?? [];
      list.push(expense);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [data.expenses]);

  function shiftMonth(delta: number) {
    const key = shiftedMonth(data.month, delta);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", key);
    params.delete("page");
    router.push(`/budget?${params.toString()}`);
  }

  const summary = [
    {
      label: "Sarflangan",
      value: formatCurrency(data.total),
      icon: TrendingDown,
      accent: "text-rose-600 bg-rose-500/10 dark:text-rose-400",
    },
    {
      label: "Qolgan",
      value: formatCurrency(remaining),
      icon: PiggyBank,
      accent: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
    },
    {
      label: "Kunlik o'rtacha",
      value: formatCurrency(average),
      icon: Wallet,
      accent: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budjet"
        description="Xarajatlaringizni kuzatib, budjetni boshqaring."
      >
        <Button variant="outline" onClick={() => setBudgetOpen(true)}>
          <Wallet className="size-4" /> Budjet belgilash
        </Button>
        <Button onClick={() => setExpenseOpen(true)}>
          <Plus className="size-4" /> Xarajat qo'shish
        </Button>
      </PageHeader>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
        <Button variant="ghost" size="icon-sm" onClick={() => shiftMonth(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium capitalize">
          {monthLabel(data.month)}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={() => shiftMonth(1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {summary.map((item) => (
          <Card key={item.label} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <span
                className={`flex size-8 items-center justify-center rounded-lg ${item.accent}`}
              >
                <item.icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight">
              {item.value}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budjet jarayoni</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {data.budget > 0
                ? `${formatCurrency(data.total)} / ${formatCurrency(data.budget)}`
                : "Budjet belgilanmagan"}
            </span>
            <span className="font-medium tabular-nums">{progress}%</span>
          </div>
          <Progress
            value={progress}
            className={progress > 90 ? "[&>div]:bg-destructive" : undefined}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kategoriya bo'yicha</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byCategory.length === 0 ? (
              <EmptyState
                icon={PiggyBank}
                title="Ma'lumot yo'q"
                description="Bu oyda xarajatlar kiritilmagan."
              />
            ) : (
              <div className="space-y-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.byCategory}
                        dataKey="amount"
                        nameKey="label"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {data.byCategory.map((item) => (
                          <Cell key={item.category} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {data.byCategory.map((item) => (
                    <div
                      key={item.category}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Xarajatlar</CardTitle>
          </CardHeader>
          <CardContent>
            {data.expenses.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Xarajatlar yo'q"
                description="Bu oy uchun xarajat qo'shib boshlang."
                action={
                  <Button onClick={() => setExpenseOpen(true)}>
                    <Plus className="size-4" /> Xarajat qo'shish
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                {groups.map(([day, items]) => {
                  const dayTotal = items.reduce(
                    (sum, item) => sum + item.amount,
                    0
                  );
                  return (
                    <div key={day} className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium">
                          {formatDate(day)}
                        </span>
                        <span className="tabular-nums">
                            Bu sahifada: {formatCurrency(dayTotal)}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {items.map((expense) => (
                          <div
                            key={expense.id}
                            className="group flex items-center gap-3 rounded-lg border border-border p-2.5"
                          >
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: expenseCategoryColor(
                                  expense.category
                                ),
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm">
                                {expense.description ||
                                  expenseCategoryLabel(expense.category)}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-medium tabular-nums">
                              {formatCurrency(expense.amount)}
                            </span>
                            <ConfirmDialog
                              title="Xarajatni o'chirish"
                              description="Bu xarajat o'chiriladi."
                              onConfirm={async () => {
                                const result = await deleteExpense(expense.id);
                                if (!result.success) toast.error(result.error);
                                else {
                                  toast.success("O'chirildi");
                                  router.refresh();
                                }
                              }}
                              trigger={
                                <Button variant="ghost" size="icon-sm">
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ExpenseFormDialog open={expenseOpen} onOpenChange={setExpenseOpen} />
      <BudgetFormDialog
        open={budgetOpen}
        onOpenChange={setBudgetOpen}
        month={data.month}
        amount={data.budget}
      />
    </div>
  );
}
