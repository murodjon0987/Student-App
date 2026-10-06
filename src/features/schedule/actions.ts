"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import { scheduleSchema, type ScheduleInput } from "./schema";

export async function saveSchedule(
  input: ScheduleInput
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const data = parsed.data;

  try {
    if (data.id) {
      const existing = await prisma.schedule.findFirst({
        where: { id: data.id, userId },
      });
      if (!existing) return fail("Dars topilmadi");

      await prisma.schedule.update({
        where: { id: data.id },
        data: {
          title: data.title,
          subjectId: data.subjectId || null,
          teacher: data.teacher ?? null,
          room: data.room ?? null,
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          color: data.color,
        },
      });
      revalidatePath("/", "layout");
      return ok({ id: data.id });
    }

    const created = await prisma.schedule.create({
      data: {
        userId,
        title: data.title,
        subjectId: data.subjectId || null,
        teacher: data.teacher ?? null,
        room: data.room ?? null,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        color: data.color,
      },
    });
    revalidatePath("/", "layout");
    return ok({ id: created.id });
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}

export async function deleteSchedule(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  const existing = await prisma.schedule.findFirst({ where: { id, userId } });
  if (!existing) return fail("Dars topilmadi");

  try {
    await prisma.schedule.delete({ where: { id } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik yuz berdi");
  }
}
