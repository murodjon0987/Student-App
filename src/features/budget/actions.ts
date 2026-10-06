"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import { budgetSchema, expenseSchema, type ExpenseInput } from "./schema";

export async function addExpense(
  input: ExpenseInput
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const data = parsed.data;
  const date = new Date(data.date);
  if (Number.isNaN(date.getTime())) return fail("Sana noto'g'ri");

  try {
    const created = await prisma.expense.create({
      data: {
        userId,
        amount: data.amount,
        category: data.category,
        description: data.description ?? null,
        date,
      },
    });
    revalidatePath("/", "layout");
    return ok({ id: created.id });
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) return fail("Xarajat topilmadi");

  try {
    await prisma.expense.delete({ where: { id } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik yuz berdi");
  }
}

export async function setBudget(
  month: string,
  amount: number
): Promise<ActionResult> {
  const { userId } = await verifySession();

  const parsed = budgetSchema.safeParse({ month, amount });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  try {
    await prisma.budget.upsert({
      where: { userId_month: { userId, month: parsed.data.month } },
      create: {
        userId,
        month: parsed.data.month,
        amount: parsed.data.amount,
      },
      update: { amount: parsed.data.amount },
    });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}
