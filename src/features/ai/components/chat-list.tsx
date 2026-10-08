"use client";

import * as React from "react";
import { MessageSquarePlus, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";

export interface ChatListItem {
  id: string;
  title: string;
  updatedAt: Date | string;
}

interface Props {
  chats: ChatListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function ChatList({
  chats,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: Props) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");

  function startEdit(id: string, title: string) {
    setEditingId(id);
    setDraft(title);
  }

  function commit() {
    if (!editingId) return;
    const title = draft.trim();
    const original = chats.find((c) => c.id === editingId);
    if (title && title !== original?.title) {
      onRename(editingId, title);
    }
    setEditingId(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button onClick={onNew} className="w-full justify-start" variant="outline">
          <MessageSquarePlus className="size-4" /> Yangi suhbat
        </Button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {chats.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            Hali suhbatlar yo'q
          </p>
        )}

        {chats.map((chat) => {
          const active = chat.id === activeId;
          const editing = editingId === chat.id;

          return (
            <div
              key={chat.id}
              className={cn(
                "group flex items-center gap-1 rounded-lg px-2 transition-colors",
                active ? "bg-primary/10" : "hover:bg-accent"
              )}
            >
              {editing ? (
                <Input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commit();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="my-1 h-7 text-xs"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(chat.id)}
                  onDoubleClick={() => startEdit(chat.id, chat.title)}
                  className="min-w-0 flex-1 py-2 text-left"
                >
                  <span
                    className={cn(
                      "block truncate text-sm",
                      active ? "font-medium text-primary" : "text-foreground"
                    )}
                  >
                    {chat.title}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {timeAgo(chat.updatedAt)}
                  </span>
                </button>
              )}

              {!editing && (
                <div className="flex shrink-0 items-center opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => startEdit(chat.id, chat.title)}
                    aria-label="Nomini o'zgartirish"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <ConfirmDialog
                    title="Suhbatni o'chirish"
                    description={`"${chat.title}" butunlay o'chiriladi.`}
                    onConfirm={() => onDelete(chat.id)}
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="O'chirish">
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
