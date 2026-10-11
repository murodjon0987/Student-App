"use client";

import * as React from "react";
import { ArrowUp, ImagePlus, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onSend: (text: string, options?: { image?: boolean }) => void;
  onStop: () => void;
  streaming: boolean;
}

export function ChatInput({ onSend, onStop, streaming }: Props) {
  const [value, setValue] = React.useState("");
  const [imageMode, setImageMode] = React.useState(false);
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  function submit() {
    const text = value.trim();
    if (!text || streaming) return;
    onSend(text, { image: imageMode });
    setValue("");
  }

  return (
    <div className="shrink-0 border-t border-border bg-background/80 p-2 backdrop-blur sm:p-4">
      <div
        className={cn(
          "mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/30",
          imageMode
            ? "border-primary/60 focus-within:border-primary"
            : "border-input focus-within:border-ring"
        )}
      >
        <Button
          type="button"
          size="icon"
          variant={imageMode ? "default" : "ghost"}
          onClick={() => setImageMode((v) => !v)}
          aria-label="Rasm generatsiyasi"
          aria-pressed={imageMode}
          title="Rasm generatsiyasi"
          className="shrink-0"
        >
          <ImagePlus className="size-4" />
        </Button>
        <textarea
          ref={ref}
          value={value}
          rows={1}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            imageMode
              ? "Rasm tavsifini yozing... (masalan: kitob o'qiyotgan mushuk)"
              : "Savolingizni yozing... (Shift+Enter — yangi qator)"
          }
          aria-label="Xabar"
          className="max-h-[180px] min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
        />
        {streaming ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={onStop}
            aria-label="To'xtatish"
            className="shrink-0"
          >
            <Square className="size-4 fill-current" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Yuborish"
            className={cn("shrink-0")}
          >
            <ArrowUp className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
