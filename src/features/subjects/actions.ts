"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import { subjectSchema, type SubjectInput } from "./schema";

export async function saveSubject(
  input: SubjectInput
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const { id, name, teacher, color } = parsed.data;

  try {
    if (id) {
      const existing = await prisma.subject.findFirst({
        where: { id, userId },
      });
      if (!existing) return fail("Fan topilmadi");

      await prisma.subject.update({
        where: { id },
        data: { name, teacher: teacher ?? null, color },
      });
      revalidatePath("/", "layout");
      return ok({ id });
    }

    const created = await prisma.subject.create({
      data: { userId, name, teacher: teacher ?? null, color },
    });
    revalidatePath("/", "layout");
    return ok({ id: created.id });
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  const existing = await prisma.subject.findFirst({ where: { id, userId } });
  if (!existing) return fail("Fan topilmadi");

  try {
    await prisma.subject.delete({ where: { id } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik yuz berdi");
  }
}
