"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { ownsSubject } from "@/lib/ownership";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import { noteSchema, type NoteInput } from "./schema";

export async function saveNote(
  input: NoteInput
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const data = parsed.data;

  try {
    if (!(await ownsSubject(userId, data.subjectId))) return fail("Fan topilmadi");

    if (data.id) {
      const existing = await prisma.note.findFirst({
        where: { id: data.id, userId },
      });
      if (!existing) return fail("Eslatma topilmadi");

      await prisma.note.update({
        where: { id: data.id, userId },
        data: {
          title: data.title,
          content: data.content,
          subjectId: data.subjectId || null,
          tags: data.tags,
        },
      });
      revalidatePath("/", "layout");
      return ok({ id: data.id });
    }

    const created = await prisma.note.create({
      data: {
        userId,
        title: data.title,
        content: data.content,
        subjectId: data.subjectId || null,
        tags: data.tags,
      },
    });
    revalidatePath("/", "layout");
    return ok({ id: created.id });
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  try {
    const existing = await prisma.note.findFirst({ where: { id, userId } });
    if (!existing) return fail("Eslatma topilmadi");

    await prisma.note.delete({ where: { id, userId } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik");
  }
}
