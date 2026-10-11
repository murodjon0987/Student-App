"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarRange,
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
import type { gradeSummary } from "@/lib/list-query";
import {
  GradeFormDialog,
  type GradeItem,
} from "@/features/gpa/components/grade-form-dialog";
import { SemesterManagerDialog } from "@/features/gpa/components/semester-manager-dialog";

interface Props {
  grades: GradeItem[];
  summary: ReturnType<typeof gradeSummary>;
  semesters: {
    id: string;
    name: string;
    startDate: Date | string | null;
    endDate: Date | string | null;
  }[];
  activeSemester: string;
  filters?: React.ReactNode;
}

export function GpaView({
  grades,
  summary,
  semesters,
  activeSemester,
  filters,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [semesterOpen, setSemesterOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<GradeItem | null>(null);

  const { totalCredits, gpa, average } = summary;
  const activeSemesterName = semesters.find((s) => s.id === activeSemester)?.name;

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
        description={
          activeSemesterName
            ? `${activeSemesterName} bo'yicha natijalar.`
            : "Baholaringiz asosida GPA va kreditlaringizni hisoblang."
        }
      >
        <Button variant="outline" onClick={() => setSemesterOpen(true)}>
          <CalendarRange className="size-4" /> Semestrlar
        </Button>
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

      {filters}

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
            <div className="hidden items-center gap-2 border-b border-border px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:flex sm:gap-3 sm:px-5">
              <span className="flex-1">Fan</span>
              <span className="w-14 text-center sm:w-20">Kredit</span>
              <span className="w-12 text-center sm:w-16">Baho</span>
              <span className="w-[76px] sm:w-20" />
            </div>
            <div className="divide-y divide-border">
              {grades.map((grade) => (
                <div
                  key={grade.id}
                  className="group flex flex-wrap items-center gap-2 px-4 py-3 sm:flex-nowrap sm:gap-3 sm:px-5"
                >
                  <span className="min-w-0 w-full text-sm font-medium sm:w-auto sm:flex-1 sm:truncate">
                    {grade.subjectName}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground sm:w-20 sm:text-center">
                    <span className="mr-1 text-xs sm:hidden">Kredit:</span>
                    {formatNumber(grade.credit, 1)}
                  </span>
                  <span className="flex items-center gap-1 sm:w-16 sm:justify-center">
                    <span className="text-xs text-muted-foreground sm:hidden">Baho:</span>
                    <Badge
                      variant={Number(grade.grade) >= 4 ? "success" : "secondary"}
                    >
                      {grade.grade}
                    </Badge>
                  </span>
                  <span className="ml-auto flex shrink-0 items-center justify-end gap-1 sm:w-20">
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

      <GradeFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        semesters={semesters}
        defaultSemesterId={activeSemester || null}
      />
      <SemesterManagerDialog
        open={semesterOpen}
        onOpenChange={setSemesterOpen}
        semesters={semesters}
      />
    </div>
  );
}
