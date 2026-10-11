"use server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok } from "@/lib/types";
import { allocatePlan, localDateKey } from "./algorithms";
import { idSchema, planSchema, topicSchema } from "./schema";

export async function saveStudyPlan(input: unknown) {
  const { userId } = await verifySession();
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Reja noto'g'ri");
  try {
    const result = await prisma.$transaction(async (tx) => {
      const exam = await tx.exam.findFirst({ where: { id: parsed.data.examId, userId } });
      if (!exam) throw new Error("Imtihon topilmadi");
      const allocation = allocatePlan(parsed.data.topics, parsed.data.dailyMinutes, exam.date);
      if (!allocation.days) throw new Error("Kelajakdagi imtihonni tanlang");
      if (localDateKey(exam.date) > localDateKey(new Date(Date.now() + 366 * 86_400_000))) throw new Error("Imtihon 366 kun ichida bo'lsin");
      const old = await tx.studyPlan.findUnique({ where: { examId: exam.id } });
      if (old) await tx.studyPlan.delete({ where: { id: old.id, userId } });
      const plan = await tx.studyPlan.create({ data: { userId, examId: exam.id, dailyMinutes: parsed.data.dailyMinutes, topics: parsed.data.topics, tasks: { create: allocation.tasks } } });
      await tx.exam.update({ where: { id: exam.id, userId }, data: { prepProgress: 0 } });
      return { id: plan.id, unscheduledMinutes: allocation.unscheduledMinutes };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/", "layout"); return ok(result);
  } catch (e) { return fail(e instanceof Error && ["Imtihon topilmadi", "Kelajakdagi imtihonni tanlang", "Imtihon 366 kun ichida bo'lsin"].includes(e.message) ? e.message : "Rejani saqlab bo'lmadi"); }
}

export async function reschedulePlan(input: unknown) {
  const { userId } = await verifySession();
  const parsed = z.object({ id: idSchema, dailyMinutes: z.number().int().min(10).max(480) }).safeParse(input);
  if (!parsed.success) return fail("Kunlik vaqt 10–480 daqiqa bo'lsin");
  try {
    const result = await prisma.$transaction(async (tx) => {
      const plan = await tx.studyPlan.findFirst({ where: { id: parsed.data.id, userId }, include: { exam: true, tasks: true } });
      if (!plan) throw new Error("Reja topilmadi");
      const topics = z.array(topicSchema).parse(plan.topics);
      const allocation = allocatePlan(topics, parsed.data.dailyMinutes, plan.exam.date, plan.tasks.filter((t) => t.done));
      if (!allocation.days && allocation.unscheduledMinutes) throw new Error("Imtihongacha vaqt qolmagan");
      await tx.studyPlanTask.deleteMany({ where: { planId: plan.id, done: false } });
      await tx.studyPlan.update({ where: { id: plan.id, userId }, data: { dailyMinutes: parsed.data.dailyMinutes, tasks: { create: allocation.tasks } } });
      return { unscheduledMinutes: allocation.unscheduledMinutes };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/", "layout"); return ok(result);
  } catch (e) { return fail(e instanceof Error && ["Reja topilmadi", "Imtihongacha vaqt qolmagan"].includes(e.message) ? e.message : "Qayta taqsimlab bo'lmadi"); }
}

export async function completePlanTask(input: unknown) {
  const { userId } = await verifySession();
  const parsed = z.object({ id: idSchema, done: z.boolean() }).safeParse(input);
  if (!parsed.success) return fail("Vazifa noto'g'ri");
  try {
    await prisma.$transaction(async (tx) => {
      const task = await tx.studyPlanTask.findFirst({ where: { id: parsed.data.id, plan: { userId } }, include: { plan: true } });
      if (!task) throw new Error("Vazifa topilmadi");
      await tx.studyPlanTask.update({ where: { id: task.id }, data: { done: parsed.data.done } });
      const completed = await tx.studyPlanTask.aggregate({ where: { planId: task.planId, done: true }, _sum: { minutes: true } });
      const total = z.array(topicSchema).parse(task.plan.topics).reduce((sum, t) => sum + t.minutes, 0);
      await tx.exam.update({ where: { id: task.plan.examId, userId }, data: { prepProgress: Math.min(100, Math.round((completed._sum.minutes ?? 0) / total * 100)) } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/", "layout"); return ok();
  } catch { return fail("Vazifani yangilab bo'lmadi"); }
}

export async function deleteStudyPlan(input: unknown) {
  const { userId } = await verifySession();
  const id = idSchema.safeParse(input); if (!id.success) return fail("Reja noto'g'ri");
  try {
    const deleted = await prisma.studyPlan.deleteMany({ where: { id: id.data, userId } });
    if (!deleted.count) return fail("Reja topilmadi");
    revalidatePath("/study-plans"); return ok();
  } catch { return fail("O'chirib bo'lmadi"); }
}
