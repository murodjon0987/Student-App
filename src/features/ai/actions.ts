"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import { renameChatSchema, type RenameChatInput } from "./schema";
import { redactProviderTokens } from "./content";

export async function loadChatMessages(
  id: string
): Promise<ActionResult<{ id: string; role: "user" | "assistant"; content: string }[]>> {
  const { userId } = await verifySession();

  const chat = await prisma.chat.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!chat) return fail("Suhbat topilmadi");

  const messages = await prisma.chatMessage.findMany({
    where: { chatId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true },
  });

  return ok(
    messages.map((m) => ({
      id: m.id,
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: redactProviderTokens(m.content),
    }))
  );
}

export async function deleteChat(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  const existing = await prisma.chat.findFirst({ where: { id, userId } });
  if (!existing) return fail("Suhbat topilmadi");

  try {
    await prisma.chat.delete({ where: { id } });
    revalidatePath("/ai");
    return ok();
  } catch {
    return fail("O'chirishda xatolik");
  }
}

export async function renameChat(
  input: RenameChatInput
): Promise<ActionResult> {
  const { userId } = await verifySession();

  const parsed = renameChatSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const existing = await prisma.chat.findFirst({
    where: { id: parsed.data.id, userId },
  });
  if (!existing) return fail("Suhbat topilmadi");

  try {
    await prisma.chat.update({
      where: { id: parsed.data.id },
      data: { title: parsed.data.title },
    });
    revalidatePath("/ai");
    return ok();
  } catch {
    return fail("Saqlashda xatolik");
  }
}
