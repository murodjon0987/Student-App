"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { ownsSubject } from "@/lib/ownership";
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
  const endedAt = data.endedAt ? new Date(data.endedAt) : new Date();
  if (endedAt.getTime() > Date.now() + 60_000) return fail("Yakunlanish vaqti noto'g'ri");

  try {
    if (!(await ownsSubject(userId, data.subjectId))) return fail("Fan topilmadi");

    const record = {
        userId,
        subjectId: data.subjectId || null,
        durationMin: data.durationMin,
        mode: data.mode,
        startedAt: new Date(endedAt.getTime() - data.durationMin * 60_000),
        endedAt,
    };
    // Namespace client retry IDs by the authenticated user. Repeated requests,
    // reloads and other tabs all refer to a single saved session.
    const id = data.sessionId ? `focus:${userId}:${data.sessionId}` : undefined;
    const created = id
      ? await prisma.studySession.upsert({ where: { id }, create: { id, ...record }, update: {} })
      : await prisma.studySession.create({ data: record });
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
    await prisma.studySession.delete({ where: { id, userId } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik yuz berdi");
  }
}
