"use client";

import * as React from "react";
import { Bot, Check, Copy, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Markdown } from "@/features/ai/components/markdown";

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

export function ChatMessage({ message }: { message: UiMessage }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = React.useState(false);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  const empty = message.pending && !message.content;

  return (
    <div className="group flex gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Sparkles className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
          {empty ? (
            <TypingDots />
          ) : (
            <Markdown content={message.content} />
          )}
        </div>
        {!empty && (
          <div className="mt-1 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(message.content).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {copied ? (
                <Check className="size-3" />
              ) : (
                <Copy className="size-3" />
              )}
              {copied ? "Nusxa olindi" : "Nusxa"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function WelcomeScreen({
  onPrompt,
}: {
  onPrompt: (text: string) => void;
}) {
  const prompts = [
    "Bugungi vazifalarim va muddatlarim nima?",
    "Imtihonga qanday samarali tayyorlanaman?",
    "Dars jadvalimni tahlil qilib, bo'sh vaqtimni ayt",
    "Bu oy budjetim qanday ketdi?",
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Bot className="size-7" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">
        Salom! Men sizning AI o'quv yordamchingizman
      </h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Jadval, vazifa, imtihon, budjet va o'qish bo'yicha savollaringizga
        ma'lumotlaringizga qarab javob beraman.
      </p>
      <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPrompt(prompt)}
            className={cn(
              "rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition-colors",
              "hover:border-primary/40 hover:bg-primary/5"
            )}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
