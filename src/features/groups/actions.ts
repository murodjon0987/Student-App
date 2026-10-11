"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { consumeRateLimit } from "@/lib/rate-limit";
import { fail, ok, type ActionResult } from "@/lib/types";
import { createGroupSchema, joinGroupSchema, groupPostSchema } from "./schema";

export async function createGroup(input: unknown): Promise<ActionResult> {
  const { userId } = await verifySession();
  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  try {
    if (!(await consumeRateLimit("group-create", userId, 5, 3600_000)).allowed) return fail("Keyinroq urinib ko'ring");
    await prisma.studentGroup.create({ data: {
      ...parsed.data, ownerId: userId, inviteCode: randomBytes(8).toString("hex").toUpperCase(),
      members: { create: { userId } },
    } });
    revalidatePath("/groups");
    return ok();
  } catch { return fail("Guruhni yaratib bo'lmadi"); }
}

export async function joinGroup(input: unknown): Promise<ActionResult> {
  const { userId } = await verifySession();
  const parsed = joinGroupSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  try {
    if (!(await consumeRateLimit("group-join", userId, 10, 600_000)).allowed) return fail("Urinishlar ko'p. Keyinroq urinib ko'ring");
    const group = await prisma.studentGroup.findUnique({ where: { inviteCode: parsed.data }, select: { id: true } });
    if (!group) return fail("Taklif kodi topilmadi");
    await prisma.groupMember.upsert({ where: { groupId_userId: { groupId: group.id, userId } }, create: { groupId: group.id, userId }, update: {} });
    revalidatePath("/groups");
    return ok();
  } catch { return fail("Guruhga qo'shilib bo'lmadi"); }
}

export async function publishGroupPost(input: unknown): Promise<ActionResult> {
  const { userId } = await verifySession();
  const parsed = groupPostSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  try {
    const member = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: parsed.data.groupId, userId } } });
    if (!member) return fail("Siz bu guruh a'zosi emassiz");
    if (!(await consumeRateLimit("group-post", userId, 20, 600_000)).allowed) return fail("Keyinroq urinib ko'ring");
    await prisma.groupPost.create({ data: { ...parsed.data, url: parsed.data.url || null, authorId: userId } });
    revalidatePath("/groups");
    return ok();
  } catch { return fail("Postni saqlab bo'lmadi"); }
}

export async function deleteGroupPost(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();
  if (typeof id !== "string" || id.length > 100) return fail("Noto'g'ri post");
  try {
    const deleted = await prisma.groupPost.deleteMany({ where: { id, group: { members: { some: { userId } } }, OR: [{ authorId: userId }, { group: { ownerId: userId } }] } });
    if (!deleted.count) return fail("Post topilmadi yoki ruxsat yo'q");
    revalidatePath("/groups");
    return ok();
  } catch { return fail("Postni o'chirib bo'lmadi"); }
}

export async function replyToQuestion(input: unknown): Promise<ActionResult> {
  const { userId } = await verifySession();
  const parsed = z.object({ postId: z.string().min(1).max(100), content: z.string().trim().min(1).max(5000) }).safeParse(input);
  if (!parsed.success) return fail("Javob 1–5000 belgi bo'lsin");
  try {
    const post = await prisma.groupPost.findFirst({ where: { id: parsed.data.postId, kind: "QUESTION", group: { members: { some: { userId } } } } });
    if (!post) return fail("Savol topilmadi yoki guruhga kirish huquqi yo'q");
    if (!(await consumeRateLimit("group-reply", userId, 20, 600_000)).allowed) return fail("Keyinroq urinib ko'ring");
    await prisma.groupReply.create({ data: { postId: post.id, authorId: userId, content: parsed.data.content } });
    revalidatePath("/groups"); return ok();
  } catch { return fail("Javobni saqlab bo'lmadi"); }
}

export async function acceptQuestionReply(input: unknown): Promise<ActionResult> {
  const { userId } = await verifySession();
  const parsed = z.object({ id: z.string().min(1).max(100), accepted: z.boolean() }).safeParse(input);
  if (!parsed.success) return fail("Javob noto'g'ri");
  try {
    await prisma.$transaction(async (tx) => {
      const reply = await tx.groupReply.findFirst({ where: { id: parsed.data.id, post: { kind: "QUESTION", group: { members: { some: { userId } } }, OR: [{ authorId: userId }, { group: { ownerId: userId } }] } } });
      if (!reply) throw new Error("Ruxsat yo'q");
      await tx.groupReply.updateMany({ where: { postId: reply.postId }, data: { accepted: false } });
      if (parsed.data.accepted) await tx.groupReply.update({ where: { id: reply.id }, data: { accepted: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/groups"); return ok();
  } catch { return fail("Javobni belgilab bo'lmadi yoki ruxsat yo'q"); }
}

export async function deleteQuestionReply(input: unknown): Promise<ActionResult> {
  const { userId } = await verifySession();
  const parsed = z.string().min(1).max(100).safeParse(input);
  if (!parsed.success) return fail("Javob noto'g'ri");
  try {
    const result = await prisma.groupReply.deleteMany({ where: { id: parsed.data, post: { group: { members: { some: { userId } } } }, OR: [{ authorId: userId }, { post: { group: { ownerId: userId } } }] } });
    if (!result.count) return fail("Javob topilmadi yoki ruxsat yo'q");
    revalidatePath("/groups"); return ok();
  } catch { return fail("Javobni o'chirib bo'lmadi"); }
}
