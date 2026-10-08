"use client";

import { useRouter } from "next/navigation";
import { Brain, CalendarDays, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { minutesToHours, timeAgo } from "@/lib/format";
import { deleteStudySession } from "@/features/focus/actions";
import { FocusTimer } from "@/features/focus/components/focus-timer";
import type { FocusData } from "@/features/focus/queries";

interface Props {
  subjects: { id: string; name: string }[];
  data: FocusData;
}

export function FocusView({ subjects, data }: Props) {
  const router = useRouter();

  const subjectName = (id: string | null) =>
    subjects.find((subject) => subject.id === id)?.name ?? null;

  const stats = [
    { label: "Bugun", value: minutesToHours(data.todayMinutes), icon: Clock },
    {
      label: "Shu hafta",
      value: minutesToHours(data.weekMinutes),
      icon: CalendarDays,
    },
    {
      label: "Jami sessiyalar",
      value: String(data.sessions.length),
      icon: Brain,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Focus rejim"
        description="Pomodoro texnikasi bilan diqqatni jamlang."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((item) => (
          <Card key={item.label} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight">
              {item.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <FocusTimer subjects={subjects} />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">So&apos;nggi sessiyalar</CardTitle>
          </CardHeader>
          <CardContent>
            {data.sessionsToday.length === 0 ? (
              <EmptyState
                icon={Brain}
                title="Sessiyalar yo'q"
                description="Birinchi pomodoro seansini boshlang."
              />
            ) : (
              <div className="space-y-2">
                {data.sessionsToday.map((session) => (
                  <div
                    key={session.id}
                    className="group flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Clock className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {minutesToHours(session.durationMin)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {subjectName(session.subjectId) ?? "Fan tanlanmagan"} ·{" "}
                        {timeAgo(session.startedAt)}
                      </p>
                    </div>
                    <ConfirmDialog
                      title="Sessiyani o'chirish"
                      description="Bu o'quv sessiyasi o'chiriladi."
                      onConfirm={async () => {
                        const result = await deleteStudySession(session.id);
                        if (!result.success) toast.error(result.error);
                        else {
                          toast.success("O'chirildi");
                          router.refresh();
                        }
                      }}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="O'chirish"
                          className="opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
