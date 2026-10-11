"use server";

import { revalidatePath } from "next/cache";
import { parseAcademicDateTime } from "@/lib/date";

import { prisma } from "@/lib/prisma";
import { ownsSubject } from "@/lib/ownership";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import { taskSchema, type TaskInput, type TaskStatus } from "./schema";

function parseDeadline(value?: string | null) {
  if (!value) return null;
  const date = parseAcademicDateTime(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function saveTask(
  input: TaskInput
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const data = parsed.data;
  const deadline = parseDeadline(data.deadline);
  const completedAt = data.status === "COMPLETED" ? new Date() : null;

  try {
    if (!(await ownsSubject(userId, data.subjectId))) return fail("Fan topilmadi");

    if (data.id) {
      const existing = await prisma.task.findFirst({
        where: { id: data.id, userId },
      });
      if (!existing) return fail("Vazifa topilmadi");

      await prisma.task.update({
        where: { id: data.id, userId },
        data: {
          title: data.title,
          description: data.description ?? null,
          subjectId: data.subjectId || null,
          priority: data.priority,
          status: data.status,
          category: data.category ?? null,
          deadline,
          completedAt:
            data.status === "COMPLETED"
              ? existing.completedAt ?? completedAt
              : null,
        },
      });
      revalidatePath("/", "layout");
      return ok({ id: data.id });
    }

    const created = await prisma.task.create({
      data: {
        userId,
        title: data.title,
        description: data.description ?? null,
        subjectId: data.subjectId || null,
        priority: data.priority,
        status: data.status,
        category: data.category ?? null,
        deadline,
        completedAt,
      },
    });
    revalidatePath("/", "layout");
    return ok({ id: created.id });
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}

export async function setTaskStatus(
  id: string,
  status: TaskStatus
): Promise<ActionResult> {
  const { userId } = await verifySession();

  if (!taskSchema.shape.status.safeParse(status).success) {
    return fail("Vazifa holati noto'g'ri");
  }

  try {
    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) return fail("Vazifa topilmadi");

    await prisma.task.update({
      where: { id, userId },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("Yangilashda xatolik");
  }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  try {
    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) return fail("Vazifa topilmadi");

    await prisma.task.delete({ where: { id, userId } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik");
  }
}
