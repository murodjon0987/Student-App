"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { MATERIAL_CATEGORIES } from "@/lib/constants";
import { deleteMaterial } from "@/features/materials/actions";
import {
  MaterialFormDialog,
  type MaterialItem,
} from "@/features/materials/components/material-form-dialog";

interface Props {
  materials: MaterialItem[];
  filters: React.ReactNode;
  subjects: { id: string; name: string }[];
}

function categoryLabel(value: string) {
  return MATERIAL_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function MaterialsView({ materials, subjects, filters }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MaterialItem | null>(null);

  const subjectName = (id: string | null) =>
    subjects.find((s) => s.id === id)?.name ?? null;

  const filtered = materials;

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(material: MaterialItem) {
    setEditing(material);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Materiallar"
        description="Foydali o'quv manbalarini to'plang."
      >
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Material qo'shish
        </Button>
      </PageHeader>

      {filters}

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Materiallar yo'q"
          description="Birinchi materialingizni qo'shib boshlang."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Material qo'shish
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((material) => (
            <div
              key={material.id}
              className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 flex-1 font-medium">{material.title}</h3>
                <Badge variant="secondary" className="shrink-0">
                  {categoryLabel(material.category)}
                </Badge>
              </div>

              {material.description && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {material.description}
                </p>
              )}

              <div className="mt-2 text-xs text-muted-foreground">
                {subjectName(material.subjectId) && (
                  <span>{subjectName(material.subjectId)}</span>
                )}
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                {material.url ? (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={material.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-4" /> Ochish
                    </a>
                  </Button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(material)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <ConfirmDialog
                    title="Materialni o'chirish"
                    description={`"${material.title}" o'chiriladi.`}
                    onConfirm={async () => {
                      const result = await deleteMaterial(material.id);
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
            </div>
          ))}
        </div>
      )}

      <MaterialFormDialog
        open={open}
        onOpenChange={setOpen}
        subjects={subjects}
        initial={editing}
      />
    </div>
  );
}
