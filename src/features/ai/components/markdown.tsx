"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let index = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${index}`}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(
        <strong key={`${keyPrefix}-b-${index}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    }
    lastIndex = match.index + token.length;
    index += 1;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">
          {lang || "code"}
        </span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Nusxa olindi" : "Nusxa"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

function TextBlock({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flush = () => {
    if (!list) return;
    const items = list.items.map((item, i) => (
      <li key={i} className="ml-1">
        {renderInline(item, `li-${key}-${i}`)}
      </li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={`ol-${key++}`} className="ml-5 list-decimal space-y-1">
          {items}
        </ol>
      ) : (
        <ul key={`ul-${key++}`} className="ml-5 list-disc space-y-1">
          {items}
        </ul>
      )
    );
    list = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      flush();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);

    if (heading) {
      flush();
      blocks.push(
        <p key={`h-${key++}`} className="pt-1 font-semibold">
          {renderInline(heading[2], `h-${key}`)}
        </p>
      );
    } else if (ordered) {
      if (!list || !list.ordered) {
        flush();
        list = { ordered: true, items: [] };
      }
      list.items.push(ordered[1]);
    } else if (bullet) {
      if (!list || list.ordered) {
        flush();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
    } else {
      flush();
      blocks.push(
        <p key={`p-${key++}`} className="whitespace-pre-wrap">
          {renderInline(line, `p-${key}`)}
        </p>
      );
    }
  }
  flush();

  return <div className="space-y-2">{blocks}</div>;
}

export function Markdown({ content }: { content: string }) {
  const segments = content.split(/```/);

  return (
    <>
      {segments.map((segment, index) => {
        if (index % 2 === 1) {
          const newline = segment.indexOf("\n");
          const lang = newline === -1 ? "" : segment.slice(0, newline).trim();
          const code = newline === -1 ? segment : segment.slice(newline + 1);
          return (
            <CodeBlock
              key={`code-${index}`}
              code={code.replace(/\n$/, "")}
              lang={lang}
            />
          );
        }
        if (!segment.trim()) return null;
        return <TextBlock key={`text-${index}`} text={segment} />;
      })}
    </>
  );
}
