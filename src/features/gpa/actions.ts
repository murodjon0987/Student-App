"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import { gradeSchema, type GradeInput } from "./schema";

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

  const existing = await prisma.grade.findFirst({ where: { id, userId } });
  if (!existing) return fail("Baho topilmadi");

  try {
    await prisma.grade.delete({ where: { id } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik yuz berdi");
  }
}
