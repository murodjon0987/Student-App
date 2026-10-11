"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NotebookPen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { timeAgo } from "@/lib/format";
import { deleteNote } from "@/features/notes/actions";
import {
  NoteFormDialog,
  type NoteItem,
} from "@/features/notes/components/note-form-dialog";

interface Props {
  notes: NoteItem[];
  filters: React.ReactNode;
  subjects: { id: string; name: string }[];
}

export function NotesView({ notes, subjects, filters }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<NoteItem | null>(null);

  const subjectName = (id: string | null) =>
    subjects.find((s) => s.id === id)?.name ?? null;

  const filtered = notes;

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(note: NoteItem) {
    setEditing(note);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eslatmalar"
        description="Fikr va yozuvlaringizni saqlang."
      >
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Eslatma qo'shish
        </Button>
      </PageHeader>

      {filters}

      {filtered.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Eslatmalar yo'q"
          description="Birinchi eslatmangizni qo'shib boshlang."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Eslatma qo'shish
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => (
            <div
              key={note.id}
              role="button"
              tabIndex={0}
              onClick={() => openEdit(note)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openEdit(note);
                }
              }}
              className="group flex cursor-pointer flex-col rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 flex-1 font-medium">{note.title}</h3>
                <div
                  className="shrink-0 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ConfirmDialog
                    title="Eslatmani o'chirish"
                    description={`"${note.title}" o'chiriladi.`}
                    onConfirm={async () => {
                      const result = await deleteNote(note.id);
                      if (!result.success) toast.error(result.error);
                      else {
                        toast.success("O'chirildi");
                        router.refresh();
                      }
                    }}
                    trigger={
                      <Button variant="ghost" size="icon-sm">
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    }
                  />
                </div>
              </div>

              {note.content && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {note.content}
                </p>
              )}

              {note.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-muted-foreground">
                <Link href={`/learn?note=${note.id}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>Test va kartochka yaratish</Link>
                <span>{subjectName(note.subjectId) ?? "Umumiy"}</span>
                <span>{timeAgo(note.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <NoteFormDialog
        open={open}
        onOpenChange={setOpen}
        subjects={subjects}
        initial={editing}
      />
    </div>
  );
}
