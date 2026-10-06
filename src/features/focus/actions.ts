"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import { studySessionSchema, type StudySessionInput } from "./schema";

export async function saveStudySession(
  input: StudySessionInput
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const parsed = studySessionSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const data = parsed.data;

  try {
    const created = await prisma.studySession.create({
      data: {
        userId,
        subjectId: data.subjectId || null,
        durationMin: data.durationMin,
        mode: data.mode,
        startedAt: new Date(Date.now() - data.durationMin * 60_000),
        endedAt: new Date(),
      },
    });
    revalidatePath("/", "layout");
    return ok({ id: created.id });
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}

export async function deleteStudySession(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  const existing = await prisma.studySession.findFirst({
    where: { id, userId },
  });
  if (!existing) return fail("Sessiya topilmadi");

  try {
    await prisma.studySession.delete({ where: { id } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik yuz berdi");
  }
}
