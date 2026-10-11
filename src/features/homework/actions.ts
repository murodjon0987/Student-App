"use server";

import { revalidatePath } from "next/cache";
import { parseAcademicDateTime } from "@/lib/date";

import { prisma } from "@/lib/prisma";
import { ownsSubject } from "@/lib/ownership";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import {
  homeworkSchema,
  type HomeworkInput,
  type HomeworkStatus,
} from "./schema";

function parseDeadline(value?: string | null) {
  if (!value) return null;
  const date = parseAcademicDateTime(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function saveHomework(
  input: HomeworkInput
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const parsed = homeworkSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const data = parsed.data;
  const deadline = parseDeadline(data.deadline);

  try {
    if (!(await ownsSubject(userId, data.subjectId))) return fail("Fan topilmadi");

    if (data.id) {
      const existing = await prisma.homework.findFirst({
        where: { id: data.id, userId },
      });
      if (!existing) return fail("Vazifa topilmadi");

      await prisma.homework.update({
        where: { id: data.id, userId },
        data: {
          title: data.title,
          description: data.description ?? null,
          subjectId: data.subjectId || null,
          priority: data.priority,
          status: data.status,
          deadline,
        },
      });
      revalidatePath("/", "layout");
      return ok({ id: data.id });
    }

    const created = await prisma.homework.create({
      data: {
        userId,
        title: data.title,
        description: data.description ?? null,
        subjectId: data.subjectId || null,
        priority: data.priority,
        status: data.status,
        deadline,
      },
    });
    revalidatePath("/", "layout");
    return ok({ id: created.id });
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}

export async function setHomeworkStatus(
  id: string,
  status: HomeworkStatus
): Promise<ActionResult> {
  const { userId } = await verifySession();

  if (!homeworkSchema.shape.status.safeParse(status).success) {
    return fail("Vazifa holati noto'g'ri");
  }

  try {
    const existing = await prisma.homework.findFirst({ where: { id, userId } });
    if (!existing) return fail("Vazifa topilmadi");

    await prisma.homework.update({
      where: { id, userId },
      data: { status },
    });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("Yangilashda xatolik");
  }
}

export async function deleteHomework(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  try {
    const existing = await prisma.homework.findFirst({ where: { id, userId } });
    if (!existing) return fail("Vazifa topilmadi");

    await prisma.homework.delete({ where: { id, userId } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik");
  }
}
