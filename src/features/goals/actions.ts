"use server";

import { revalidatePath } from "next/cache";
import { parseAcademicDateTime } from "@/lib/date";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import {
  goalSchema,
  goalTaskSchema,
  type GoalInput,
} from "./schema";

function parseTargetDate(value?: string | null) {
  if (!value) return null;
  const date = parseAcademicDateTime(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function saveGoal(
  input: GoalInput
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const data = parsed.data;
  const targetDate = parseTargetDate(data.targetDate);

  try {
    if (data.id) {
      const existing = await prisma.goal.findFirst({
        where: { id: data.id, userId },
      });
      if (!existing) return fail("Maqsad topilmadi");

      await prisma.goal.update({
        where: { id: data.id },
        data: {
          title: data.title,
          description: data.description ?? null,
          targetDate,
          color: data.color,
        },
      });
      revalidatePath("/", "layout");
      return ok({ id: data.id });
    }

    const created = await prisma.goal.create({
      data: {
        userId,
        title: data.title,
        description: data.description ?? null,
        targetDate,
        color: data.color,
      },
    });
    revalidatePath("/", "layout");
    return ok({ id: created.id });
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) return fail("Maqsad topilmadi");

  try {
    await prisma.goal.delete({ where: { id } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik yuz berdi");
  }
}

export async function addGoalTask(
  goalId: string,
  title: string
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const parsed = goalTaskSchema.safeParse({ goalId, title });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const goal = await prisma.goal.findFirst({
    where: { id: parsed.data.goalId, userId },
  });
  if (!goal) return fail("Maqsad topilmadi");

  try {
    const last = await prisma.goalTask.findFirst({
      where: { goalId: goal.id },
      orderBy: { order: "desc" },
    });

    const created = await prisma.goalTask.create({
      data: {
        goalId: goal.id,
        title: parsed.data.title,
        order: (last?.order ?? -1) + 1,
      },
    });
    revalidatePath("/", "layout");
    return ok({ id: created.id });
  } catch {
    return fail("Qo'shishda xatolik yuz berdi");
  }
}

export async function toggleGoalTask(
  id: string,
  done: boolean
): Promise<ActionResult> {
  const { userId } = await verifySession();

  const existing = await prisma.goalTask.findFirst({
    where: { id, goal: { userId } },
  });
  if (!existing) return fail("Vazifa topilmadi");

  try {
    await prisma.goalTask.update({
      where: { id },
      data: { done },
    });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("Yangilashda xatolik yuz berdi");
  }
}

export async function deleteGoalTask(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  const existing = await prisma.goalTask.findFirst({
    where: { id, goal: { userId } },
  });
  if (!existing) return fail("Vazifa topilmadi");

  try {
    await prisma.goalTask.delete({ where: { id } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik yuz berdi");
  }
}
