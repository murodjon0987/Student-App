"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  CalendarX,
  Clock3,
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
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  ATTENDANCE_BADGE,
  ATTENDANCE_LABELS,
  type AttendanceStatus,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { deleteAttendance } from "@/features/attendance/actions";
import type { AttendanceSummary } from "@/features/attendance/queries";
import {
  AttendanceFormDialog,
  type AttendanceItem,
} from "@/features/attendance/components/attendance-form-dialog";

interface Row extends AttendanceItem {
  subject: { name: string; color: string } | null;
}

interface Props {
  records: Row[];
  summary: AttendanceSummary;
  subjects: { id: string; name: string }[];
  schedules: {
    id: string;
    title: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    subjectId: string | null;
  }[];
  filters: React.ReactNode;
}

function statusLabel(value: string) {
  return ATTENDANCE_LABELS[value as AttendanceStatus] ?? value;
}

function statusBadge(value: string) {
  return ATTENDANCE_BADGE[value as AttendanceStatus] ?? "secondary";
}

export function AttendanceView({
  records,
  summary,
  subjects,
  schedules,
  filters,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | null>(null);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(record: Row) {
    setEditing(record);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Davomat"
        description="Darslarga qatnashishni kuzating va foizini hisoblang."
      >
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Qayd etish
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Davomat
            </CardTitle>
            <CalendarCheck className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {summary.total > 0 ? `${summary.rate}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.attended}/{summary.total} qatnashgan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bor
            </CardTitle>
            <CalendarCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{summary.present}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kelmadi
            </CardTitle>
            <CalendarX className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{summary.absent}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kechikdi / sababli
            </CardTitle>
            <Clock3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {summary.late} / {summary.excused}
            </p>
          </CardContent>
        </Card>
      </div>

      {filters}

      {records.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Davomat yozuvlari yo'q"
          description="Birinchi darsga qatnashishni qayd etib boshlang."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Qayd etish
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-3 px-4 py-3 sm:px-5"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: record.subject?.color ?? "#64748b" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {record.subject?.name ?? "Fan tanlanmagan"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(record.date, "dd.MM.yyyy")}
                      {record.note ? ` · ${record.note}` : ""}
                    </p>
                  </div>
                  <Badge variant={statusBadge(record.status)}>
                    {statusLabel(record.status)}
                  </Badge>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(record)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <ConfirmDialog
                      title="Yozuvni o'chirish"
                      description="Ushbu davomat yozuvi o'chiriladi."
                      onConfirm={async () => {
                        const result = await deleteAttendance(record.id);
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AttendanceFormDialog
        open={open}
        onOpenChange={setOpen}
        subjects={subjects}
        schedules={schedules}
        initial={editing}
      />
    </div>
  );
}
