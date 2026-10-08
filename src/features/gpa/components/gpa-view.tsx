"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatNumber } from "@/lib/format";
import { deleteGrade } from "@/features/gpa/actions";
import {
  GradeFormDialog,
  type GradeItem,
} from "@/features/gpa/components/grade-form-dialog";

interface Props {
  grades: GradeItem[];
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function GpaView({ grades }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<GradeItem | null>(null);

  const totalCredits = React.useMemo(
    () => grades.reduce((sum, grade) => sum + grade.credit, 0),
    [grades]
  );

  const gpa = React.useMemo(() => {
    if (totalCredits <= 0) return 0;
    const weighted = grades.reduce(
      (sum, grade) => sum + Number(grade.grade) * grade.credit,
      0
    );
    return round2(weighted / totalCredits);
  }, [grades, totalCredits]);

  const average = React.useMemo(() => {
    if (grades.length === 0) return 0;
    const sum = grades.reduce(
      (total, grade) => total + Number(grade.grade),
      0
    );
    return round2(sum / grades.length);
  }, [grades]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(grade: GradeItem) {
    setEditing(grade);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="GPA kalkulyator"
        description="Baholaringiz asosida GPA va kreditlaringizni hisoblang."
      >
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Baho qo'shish
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              GPA
            </CardTitle>
            <GraduationCap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {formatNumber(gpa, 2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              O'rtacha baho
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {formatNumber(average, 2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jami kredit
            </CardTitle>
            <BookOpen className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {formatNumber(totalCredits, 1)}
            </p>
          </CardContent>
        </Card>
      </div>

      {grades.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Baholar yo'q"
          description="Baho qo'shib GPA hisoblashni boshlang."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Baho qo'shish
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:gap-3 sm:px-5">
              <span className="flex-1">Fan</span>
              <span className="w-14 text-center sm:w-20">Kredit</span>
              <span className="w-12 text-center sm:w-16">Baho</span>
              <span className="w-[76px] sm:w-20" />
            </div>
            <div className="divide-y divide-border">
              {grades.map((grade) => (
                <div
                  key={grade.id}
                  className="group flex items-center gap-2 px-4 py-3 sm:gap-3 sm:px-5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {grade.subjectName}
                  </span>
                  <span className="w-14 text-center text-sm tabular-nums text-muted-foreground sm:w-20">
                    {formatNumber(grade.credit, 1)}
                  </span>
                  <span className="flex w-12 justify-center sm:w-16">
                    <Badge
                      variant={Number(grade.grade) >= 4 ? "success" : "secondary"}
                    >
                      {grade.grade}
                    </Badge>
                  </span>
                  <span className="flex w-[76px] items-center justify-end gap-1 sm:w-20">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(grade)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <ConfirmDialog
                      title="Bahoni o'chirish"
                      description={`"${grade.subjectName}" bahosi o'chiriladi.`}
                      onConfirm={async () => {
                        const result = await deleteGrade(grade.id);
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
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <GradeFormDialog open={open} onOpenChange={setOpen} initial={editing} />
    </div>
  );
}
