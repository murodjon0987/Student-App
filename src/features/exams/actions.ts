"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import { examSchema, type ExamInput } from "./schema";

function parseExamDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function saveExam(
  input: ExamInput
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const parsed = examSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const data = parsed.data;
  const date = parseExamDate(data.date);
  if (!date) return fail("Sana noto'g'ri kiritilgan");

  try {
    if (data.id) {
      const existing = await prisma.exam.findFirst({
        where: { id: data.id, userId },
      });
      if (!existing) return fail("Imtihon topilmadi");

      await prisma.exam.update({
        where: { id: data.id },
        data: {
          title: data.title,
          subjectId: data.subjectId || null,
          date,
          time: data.time || null,
          room: data.room ?? null,
          description: data.description ?? null,
          prepProgress: data.prepProgress,
        },
      });
      revalidatePath("/", "layout");
      return ok({ id: data.id });
    }

    const created = await prisma.exam.create({
      data: {
        userId,
        title: data.title,
        subjectId: data.subjectId || null,
        date,
        time: data.time || null,
        room: data.room ?? null,
        description: data.description ?? null,
        prepProgress: data.prepProgress,
      },
    });
    revalidatePath("/", "layout");
    return ok({ id: created.id });
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}

export async function deleteExam(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  const existing = await prisma.exam.findFirst({ where: { id, userId } });
  if (!existing) return fail("Imtihon topilmadi");

  try {
    await prisma.exam.delete({ where: { id } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik yuz berdi");
  }
}

export async function updateExamProgress(
  id: string,
  progress: number
): Promise<ActionResult> {
  const { userId } = await verifySession();

  if (typeof progress !== "number" || Number.isNaN(progress)) {
    return fail("Noto'g'ri qiymat");
  }

  const clamped = Math.min(100, Math.max(0, Math.round(progress)));

  const existing = await prisma.exam.findFirst({ where: { id, userId } });
  if (!existing) return fail("Imtihon topilmadi");

  try {
    await prisma.exam.update({
      where: { id },
      data: { prepProgress: clamped },
    });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("Yangilashda xatolik yuz berdi");
  }
}
