import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { redactProviderTokens } from "./content";

export interface ChatListItem {
  id: string;
  title: string;
  updatedAt: Date;
}

export interface ChatMessageItem {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

export async function getChats(): Promise<ChatListItem[]> {
  const { userId } = await verifySession();
  return prisma.chat.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });
}

export async function getChat(id: string) {
  const { userId } = await verifySession();
  const chat = await prisma.chat.findFirst({
    where: { id, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  return chat ? { ...chat, messages: chat.messages.map((message) => ({ ...message, content: redactProviderTokens(message.content) })) } : null;
}

export async function getChatMessages(id: string): Promise<ChatMessageItem[]> {
  const { userId } = await verifySession();
  const chat = await prisma.chat.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!chat) return [];

  const messages = await prisma.chatMessage.findMany({
    where: { chatId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  });
  return messages.map((message) => ({ ...message, content: redactProviderTokens(message.content) }));
}
