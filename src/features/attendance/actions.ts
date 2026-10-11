"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { ownsSubject } from "@/lib/ownership";
import { verifySession } from "@/lib/auth/dal";
import { academicDate } from "@/lib/date";
import { fail, ok, type ActionResult } from "@/lib/types";
import { attendanceSchema, type AttendanceInput } from "./schema";

function parseDate(value: string) {
  try {
    return academicDate(value);
  } catch {
    return null;
  }
}

export async function saveAttendance(
  input: AttendanceInput
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const parsed = attendanceSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const data = parsed.data;
  const date = parseDate(data.date);
  if (!date) return fail("Sana noto'g'ri");

  try {
    if (!(await ownsSubject(userId, data.subjectId))) return fail("Fan topilmadi");

    if (data.scheduleId) {
      const schedule = await prisma.schedule.findFirst({
        where: { id: data.scheduleId, userId },
        select: { id: true },
      });
      if (!schedule) return fail("Dars jadvali topilmadi");
    }

    const subjectId = data.subjectId || null;
    const scheduleId = data.scheduleId || null;
    const note = data.note ? data.note : null;

    if (data.id) {
      const existing = await prisma.attendance.findFirst({
        where: { id: data.id, userId },
      });
      if (!existing) return fail("Yozuv topilmadi");

      await prisma.attendance.update({
        where: { id: data.id },
        data: { subjectId, scheduleId, date, status: data.status, note },
      });
      revalidatePath("/", "layout");
      return ok({ id: data.id });
    }

    // Bir kunda bir dars uchun takroriy yozuv qo'shilmasin.
    const duplicate = await prisma.attendance.findFirst({
      where: { userId, date, subjectId, scheduleId },
      select: { id: true },
    });
    if (duplicate) {
      await prisma.attendance.update({
        where: { id: duplicate.id },
        data: { status: data.status, note },
      });
      revalidatePath("/", "layout");
      return ok({ id: duplicate.id });
    }

    const created = await prisma.attendance.create({
      data: { userId, subjectId, scheduleId, date, status: data.status, note },
    });
    revalidatePath("/", "layout");
    return ok({ id: created.id });
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}

export async function deleteAttendance(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  try {
    const existing = await prisma.attendance.findFirst({
      where: { id, userId },
    });
    if (!existing) return fail("Yozuv topilmadi");

    await prisma.attendance.delete({ where: { id, userId } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik");
  }
}
