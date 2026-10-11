"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { academicDate } from "@/lib/date";
import { fail, ok, type ActionResult } from "@/lib/types";
import {
  gradeSchema,
  semesterSchema,
  type GradeInput,
  type SemesterInput,
} from "./schema";

async function ownsSemester(userId: string, semesterId: string | null) {
  if (!semesterId) return true;
  const semester = await prisma.semester.findFirst({
    where: { id: semesterId, userId },
    select: { id: true },
  });
  return semester !== null;
}

export async function saveGrade(
  input: GradeInput
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const parsed = gradeSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const data = parsed.data;

  try {
    if (!(await ownsSemester(userId, data.semesterId ?? null))) {
      return fail("Semestr topilmadi");
    }
    const semesterId = data.semesterId || null;

    if (data.id) {
      const existing = await prisma.grade.findFirst({
        where: { id: data.id, userId },
      });
      if (!existing) return fail("Baho topilmadi");

      await prisma.grade.update({
        where: { id: data.id },
        data: {
          subjectName: data.subjectName,
          credit: data.credit,
          grade: data.grade,
          semesterId,
        },
      });
      revalidatePath("/", "layout");
      return ok({ id: data.id });
    }

    const created = await prisma.grade.create({
      data: {
        userId,
        subjectName: data.subjectName,
        credit: data.credit,
        grade: data.grade,
        semesterId,
      },
    });
    revalidatePath("/", "layout");
    return ok({ id: created.id });
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}

export async function deleteGrade(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  try {
    const existing = await prisma.grade.findFirst({ where: { id, userId } });
    if (!existing) return fail("Baho topilmadi");

    await prisma.grade.delete({ where: { id, userId } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik yuz berdi");
  }
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = academicDate(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export async function saveSemester(
  input: SemesterInput
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const parsed = semesterSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }
  const data = parsed.data;

  let startDate: Date | null = null;
  let endDate: Date | null = null;
  try {
    startDate = parseDate(data.startDate);
    endDate = parseDate(data.endDate);
  } catch {
    return fail("Sana noto'g'ri");
  }
  if (data.startDate && !startDate) return fail("Boshlanish sanasi noto'g'ri");
  if (data.endDate && !endDate) return fail("Tugash sanasi noto'g'ri");
  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    return fail("Tugash sanasi boshlanishdan oldin bo'lishi mumkin emas");
  }

  try {
    if (data.id) {
      const existing = await prisma.semester.findFirst({
        where: { id: data.id, userId },
      });
      if (!existing) return fail("Semestr topilmadi");

      await prisma.semester.update({
        where: { id: data.id },
        data: { name: data.name, startDate, endDate },
      });
      revalidatePath("/", "layout");
      return ok({ id: data.id });
    }

    const created = await prisma.semester.create({
      data: { userId, name: data.name, startDate, endDate },
    });
    revalidatePath("/", "layout");
    return ok({ id: created.id });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return fail("Bu nomdagi semestr allaqachon mavjud");
    }
    return fail("Saqlashda xatolik yuz berdi");
  }
}

export async function deleteSemester(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  try {
    const existing = await prisma.semester.findFirst({ where: { id, userId } });
    if (!existing) return fail("Semestr topilmadi");

    await prisma.semester.delete({ where: { id, userId } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik yuz berdi");
  }
}
