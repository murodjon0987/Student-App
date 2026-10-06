"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  GraduationCap,
  MapPin,
  Pencil,
  Plus,
  Trash2,
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
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DeadlineCountdown } from "@/features/dashboard/components/countdown";
import { formatDate, relativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deleteExam,
  updateExamProgress,
} from "@/features/exams/actions";
import {
  ExamFormDialog,
  type ExamItem,
} from "@/features/exams/components/exam-form-dialog";

interface Props {
  exams: ExamItem[];
  subjects: { id: string; name: string }[];
}

function examTarget(exam: ExamItem) {
  const date = new Date(exam.date);
  if (exam.time) {
    const [hours, minutes] = exam.time.split(":").map(Number);
    date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  }
  return date;
}

function ExamCard({
  exam,
  subjectName,
  isPast,
  onEdit,
}: {
  exam: ExamItem;
  subjectName: string | null;
  isPast: boolean;
  onEdit: (exam: ExamItem) => void;
}) {
  const router = useRouter();
  const [progress, setProgress] = React.useState(exam.prepProgress);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setProgress(exam.prepProgress);
  }, [exam.prepProgress]);

  async function commit(value: number) {
    setSaving(true);
    const result = await updateExamProgress(exam.id, value);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      setProgress(exam.prepProgress);
      return;
    }
    toast.success("Tayyorgarlik yangilandi");
    router.refresh();
  }

  const target = examTarget(exam);

  return (
    <Card className="transition-colors hover:border-primary/30">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="truncate">{exam.title}</CardTitle>
            {isPast ? (
              <Badge variant="secondary">O'tgan</Badge>
            ) : (
              <Badge variant="default">Rejalashtirilgan</Badge>
            )}
          </div>
          {subjectName && (
            <p className="mt-1 text-sm text-muted-foreground">{subjectName}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(exam)}>
            <Pencil className="size-4" />
          </Button>
          <ConfirmDialog
            title="Imtihonni o'chirish"
            description={`"${exam.title}" o'chiriladi.`}
            onConfirm={async () => {
              const result = await deleteExam(exam.id);
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
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            {relativeDay(target)} · {formatDate(target)}
          </span>
          {exam.time && (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {exam.time}
            </span>
          )}
          {exam.room && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {exam.room}
            </span>
          )}
        </div>

        {exam.description && (
          <p className="text-sm text-muted-foreground">{exam.description}</p>
        )}

        {!isPast && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
              Imtihongacha qoldi
            </p>
            <DeadlineCountdown
              target={target}
              className="font-mono text-lg font-bold tabular-nums"
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Tayyorgarlik</span>
            <span className="font-medium tabular-nums">{progress}%</span>
          </div>
          <Progress value={progress} />
          <Slider
            value={[progress]}
            max={100}
            step={5}
            disabled={saving}
            onValueChange={(value) => setProgress(value[0] ?? 0)}
            onValueCommit={(value) => commit(value[0] ?? 0)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function ExamsView({ exams, subjects }: Props) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ExamItem | null>(null);

  const subjectName = (id: string | null) =>
    subjects.find((subject) => subject.id === id)?.name ?? null;

  const { upcoming, past } = React.useMemo(() => {
    const now = Date.now();
    const upcoming: ExamItem[] = [];
    const past: ExamItem[] = [];
    for (const exam of exams) {
      if (examTarget(exam).getTime() >= now) upcoming.push(exam);
      else past.push(exam);
    }
    return { upcoming, past };
  }, [exams]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(exam: ExamItem) {
    setEditing(exam);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Imtihonlar"
        description="Imtihonlaringizni rejalashtiring va tayyorgarlikni kuzatib boring."
      >
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Imtihon qo'shish
        </Button>
      </PageHeader>

      {exams.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Imtihonlar yo'q"
          description="Birinchi imtihoningizni qo'shib, tayyorgarlikni boshlang."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Imtihon qo'shish
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Kelayotgan ({upcoming.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {upcoming.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    subjectName={subjectName(exam.subjectId)}
                    isPast={false}
                    onEdit={openEdit}
                  />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                O'tgan ({past.length})
              </h2>
              <div
                className={cn(
                  "grid grid-cols-1 gap-4 lg:grid-cols-2",
                  "opacity-80"
                )}
              >
                {past.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    subjectName={subjectName(exam.subjectId)}
                    isPast
                    onEdit={openEdit}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <ExamFormDialog
        open={open}
        onOpenChange={setOpen}
        subjects={subjects}
        initial={editing}
      />
    </div>
  );
}
