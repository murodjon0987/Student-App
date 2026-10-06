import type { Metadata } from "next";

import { getChatMessages, getChats } from "@/features/ai/queries";
import { AiChatView } from "@/features/ai/components/ai-chat-view";

export const metadata: Metadata = { title: "AI yordamchi" };

export default async function AiPage() {
  const chats = await getChats();
  const activeId = chats[0]?.id ?? null;
  const messages = activeId ? await getChatMessages(activeId) : [];

  return (
    <AiChatView
      initialChats={chats}
      initialChatId={activeId}
      initialMessages={messages.map((m) => ({
        id: m.id,
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }))}
    />
  );
}
