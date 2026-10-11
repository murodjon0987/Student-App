"use client";

import * as React from "react";
import { History, Loader2, MessageSquarePlus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import {
  deleteChat,
  loadChatMessages,
  renameChat,
} from "@/features/ai/actions";
import {
  ChatList,
  type ChatListItem,
} from "@/features/ai/components/chat-list";
import {
  ChatMessage,
  WelcomeScreen,
  type UiMessage,
} from "@/features/ai/components/chat-message";
import { ChatInput } from "@/features/ai/components/chat-input";

interface Props {
  initialChats: ChatListItem[];
  initialChatId: string | null;
  initialMessages: UiMessage[];
}

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function AiChatView({
  initialChats,
  initialChatId,
  initialMessages,
}: Props) {
  const [chats, setChats] = React.useState<ChatListItem[]>(initialChats);
  const [activeId, setActiveId] = React.useState<string | null>(initialChatId);
  const [messages, setMessages] = React.useState<UiMessage[]>(initialMessages);
  const [streaming, setStreaming] = React.useState(false);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [listOpen, setListOpen] = React.useState(false);

  const abortRef = React.useRef<AbortController | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function reset() {
    abortRef.current?.abort();
    setActiveId(null);
    setMessages([]);
    setError(null);
    setListOpen(false);
  }

  async function selectChat(id: string) {
    if (id === activeId) {
      setListOpen(false);
      return;
    }
    abortRef.current?.abort();
    setActiveId(id);
    setError(null);
    setListOpen(false);
    setLoadingMessages(true);
    const result = await loadChatMessages(id);
    if (result.success) setMessages(result.data);
    else toast.error(result.error);
    setLoadingMessages(false);
  }

  async function send(text: string, options?: { image?: boolean }) {
    if (streaming) return;

    const wasNew = !activeId;
    const userMessage: UiMessage = { id: uid(), role: "user", content: text };
    const assistantId = uid();

    setError(null);
    setStreaming(true);
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: "assistant", content: "", pending: true },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: activeId,
          message: text,
          mode: options?.image ? "image" : undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? `Xatolik (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: {
            type: string;
            chatId?: string;
            title?: string;
            text?: string;
            message?: string;
          };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }

          if (event.type === "meta" && event.chatId) {
            const newId = event.chatId;
            const newTitle = event.title ?? text.slice(0, 60);
            if (wasNew) {
              setActiveId(newId);
              setChats((prev) => [
                { id: newId, title: newTitle, updatedAt: new Date() },
                ...prev,
              ]);
            } else {
              setChats((prev) =>
                prev.map((c) =>
                  c.id === newId ? { ...c, updatedAt: new Date() } : c
                )
              );
            }
          } else if (event.type === "delta" && event.text) {
            const chunk = event.text;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + chunk }
                  : m
              )
            );
          } else if (event.type === "error") {
            setError(event.message ?? "Xatolik yuz berdi");
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // foydalanuvchi to'xtatdi
      } else {
        setError(
          err instanceof Error ? err.message : "Kutilmagan xatolik yuz berdi"
        );
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
      setMessages((prev) =>
        prev
          .filter(
            (m) => !(m.role === "assistant" && !m.content.trim() && m.id === assistantId)
          )
          .map((m) => (m.pending ? { ...m, pending: false } : m))
      );
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteChat(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) reset();
    toast.success("Suhbat o'chirildi");
  }

  async function handleRename(id: string, title: string) {
    const result = await renameChat({ id, title });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }

  const sidebar = (
    <ChatList
      chats={chats}
      activeId={activeId}
      onSelect={selectChat}
      onNew={reset}
      onDelete={handleDelete}
      onRename={handleRename}
    />
  );

  return (
    <div className="flex min-h-[22rem] h-[calc(100dvh_-_10.5rem_-_env(safe-area-inset-top,0px)_-_env(safe-area-inset-bottom,0px))] min-w-0 flex-col gap-4 sm:h-[calc(100dvh_-_11rem_-_env(safe-area-inset-top,0px)_-_env(safe-area-inset-bottom,0px))] lg:h-[calc(100dvh_-_8.5rem)]">
      <PageHeader
        title="AI yordamchi"
        description="Ma'lumotlaringizga tayanadigan shaxsiy o'quv assistenti."
      >
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden"
          onClick={() => setListOpen(true)}
          aria-label="Suhbatlar tarixi"
        >
          <History className="size-4" />
        </Button>
        <Button variant="outline" onClick={reset} className="lg:hidden">
          <MessageSquarePlus className="size-4" /> Yangi
        </Button>
        <Button onClick={reset} className="hidden lg:inline-flex">
          <MessageSquarePlus className="size-4" /> Yangi suhbat
        </Button>
      </PageHeader>

      <div className="grid min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 border-r border-border lg:block">
          {sidebar}
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col">
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
            {loadingMessages ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="min-h-full">
                <WelcomeScreen onPrompt={send} />
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {error && (
            <div className="mx-3 mb-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:mx-4">
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Yopish"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          <ChatInput
            onSend={send}
            onStop={() => abortRef.current?.abort()}
            streaming={streaming}
          />
        </section>
      </div>

      {listOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setListOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[85vw] max-w-72 flex-col border-r border-border bg-card pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="size-4 text-primary" /> Suhbatlar
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setListOpen(false)}
                aria-label="Yopish"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1">{sidebar}</div>
          </div>
        </div>
      )}
    </div>
  );
}
