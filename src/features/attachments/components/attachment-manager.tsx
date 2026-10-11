"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatBytes } from "@/lib/format";
import {
  deleteAttachment,
  uploadAttachment,
} from "@/features/attachments/actions";
import type { AttachmentMeta } from "@/features/attachments/types";

const MAX_BYTES = 8_000_000;

interface Props {
  parent: {
    homeworkId?: string;
    noteId?: string;
    materialId?: string;
  };
}

function MimeIcon({ mimeType }: { mimeType: string | null }) {
  if (mimeType?.startsWith("image/")) return <ImageIcon className="size-4" />;
  return <FileText className="size-4" />;
}

export function AttachmentManager({ parent }: Props) {
  const router = useRouter();
  const [items, setItems] = React.useState<AttachmentMeta[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const query = React.useMemo(() => {
    const params = new URLSearchParams();
    if (parent.homeworkId) params.set("homeworkId", parent.homeworkId);
    if (parent.noteId) params.set("noteId", parent.noteId);
    if (parent.materialId) params.set("materialId", parent.materialId);
    return params.toString();
  }, [parent.homeworkId, parent.noteId, parent.materialId]);

  const load = React.useCallback(async () => {
    if (!query) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/attachments?${query}`, {
        cache: "no-store",
      });
      if (response.ok) {
        const data = (await response.json()) as { items?: AttachmentMeta[] };
        setItems(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [query]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function onSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setBusy(true);
    let failed = 0;
    for (const file of files) {
      if (file.size > MAX_BYTES) {
        failed += 1;
        continue;
      }
      const formData = new FormData();
      formData.set("file", file);
      if (parent.homeworkId) formData.set("homeworkId", parent.homeworkId);
      if (parent.noteId) formData.set("noteId", parent.noteId);
      if (parent.materialId) formData.set("materialId", parent.materialId);
      const result = await uploadAttachment(formData);
      if (!result.success) failed += 1;
    }
    setBusy(false);

    if (failed > 0) toast.error(`${failed} ta fayl yuklanmadi`);
    else toast.success("Fayllar biriktirildi");
    await load();
    router.refresh();
  }

  async function remove(id: string) {
    const result = await deleteAttachment(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Fayl o'chirildi");
    await load();
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Paperclip className="size-4" /> Fayllar
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Yuklash
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={onSelect}
        />
      </div>

      {loading ? (
        <p className="py-2 text-center text-xs text-muted-foreground">
          Yuklanmoqda...
        </p>
      ) : items.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">
          Fayl biriktirilmagan. PDF, DOCX yoki rasm (8 MB gacha).
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5"
            >
              <span className="text-muted-foreground">
                <MimeIcon mimeType={item.mimeType} />
              </span>
              <a
                href={`/api/attachments/${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-sm hover:underline"
              >
                {item.name}
              </a>
              {item.size != null && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatBytes(item.size)}
                </span>
              )}
              <ConfirmDialog
                title="Faylni o'chirish"
                description={`"${item.name}" o'chiriladi.`}
                onConfirm={() => remove(item.id)}
                trigger={
                  <Button type="button" variant="ghost" size="icon-sm">
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
