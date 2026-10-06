"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import { materialSchema, type MaterialInput } from "./schema";

export async function saveMaterial(
  input: MaterialInput
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const parsed = materialSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const data = parsed.data;
  const url = data.url || null;
  const description = data.description || null;

  try {
    if (data.id) {
      const existing = await prisma.material.findFirst({
        where: { id: data.id, userId },
      });
      if (!existing) return fail("Material topilmadi");

      await prisma.material.update({
        where: { id: data.id },
        data: {
          title: data.title,
          category: data.category,
          url,
          description,
          subjectId: data.subjectId || null,
        },
      });
      revalidatePath("/", "layout");
      return ok({ id: data.id });
    }

    const created = await prisma.material.create({
      data: {
        userId,
        title: data.title,
        category: data.category,
        url,
        description,
        subjectId: data.subjectId || null,
      },
    });
    revalidatePath("/", "layout");
    return ok({ id: created.id });
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}

export async function deleteMaterial(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  const existing = await prisma.material.findFirst({ where: { id, userId } });
  if (!existing) return fail("Material topilmadi");

  try {
    await prisma.material.delete({ where: { id } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik");
  }
}
