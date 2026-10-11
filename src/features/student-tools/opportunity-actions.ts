"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { consumeRateLimit } from "@/lib/rate-limit";
import { fail, ok } from "@/lib/types";
import { academicDate } from "./algorithms";
import { idSchema, opportunitySchema } from "./schema";

export async function saveOpportunity(input: unknown) {
  const { userId } = await verifySession();
  const parsed = opportunitySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "E'lon noto'g'ri");
  try {
    if (!(await consumeRateLimit("opportunity-publish", userId, 10, 3600_000)).allowed) return fail("E'lonlar limiti tugadi. Keyinroq urinib ko'ring.");
    const deadline = new Date(academicDate(parsed.data.deadline).getTime() + 86_400_000 - 1);
    if (deadline < new Date()) return fail("Kelajakdagi muddatni kiriting");
    const { id, ...data } = parsed.data;
    if (id) {
      const changed = await prisma.opportunity.updateMany({ where: { id, userId }, data: { ...data, deadline, verified: false } });
      if (!changed.count) return fail("E'lon topilmadi");
    } else await prisma.opportunity.create({ data: { ...data, userId, deadline } });
    revalidatePath("/opportunities"); return ok();
  } catch { return fail("E'lonni saqlab bo'lmadi. Sanani tekshiring."); }
}

export async function bookmarkOpportunity(input: unknown) {
  const { userId } = await verifySession();
  const parsed = z.object({ id: idSchema, saved: z.boolean() }).safeParse(input);
  if (!parsed.success) return fail("E'lon noto'g'ri");
  try {
    if (parsed.data.saved) {
      const exists = await prisma.opportunity.findFirst({ where: { id: parsed.data.id, deadline: { gte: new Date() } } });
      if (!exists) return fail("E'lon topilmadi yoki muddati tugagan");
      await prisma.savedOpportunity.upsert({ where: { userId_opportunityId: { userId, opportunityId: exists.id } }, create: { userId, opportunityId: exists.id }, update: {} });
    } else await prisma.savedOpportunity.deleteMany({ where: { userId, opportunityId: parsed.data.id } });
    revalidatePath("/opportunities"); return ok();
  } catch { return fail("Saqlash holatini o'zgartirib bo'lmadi"); }
}

export async function verifyOpportunity(input: unknown) {
  const { userId } = await verifySession();
  const parsed = z.object({ id: idSchema, verified: z.boolean() }).safeParse(input);
  if (!parsed.success) return fail("E'lon noto'g'ri");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return fail("Faqat administrator tasdiqlaydi");
  try {
    const changed = await prisma.opportunity.updateMany({ where: { id: parsed.data.id }, data: { verified: parsed.data.verified } });
    if (!changed.count) return fail("E'lon topilmadi");
    revalidatePath("/opportunities"); return ok();
  } catch { return fail("Tasdiqlab bo'lmadi"); }
}

export async function deleteOpportunity(input: unknown) {
  const { userId } = await verifySession();
  const id = idSchema.safeParse(input); if (!id.success) return fail("E'lon noto'g'ri");
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const result = await prisma.opportunity.deleteMany({ where: { id: id.data, ...(user?.role === "ADMIN" ? {} : { userId }) } });
    if (!result.count) return fail("E'lon topilmadi yoki ruxsat yo'q");
    revalidatePath("/opportunities"); return ok();
  } catch { return fail("O'chirib bo'lmadi"); }
}
