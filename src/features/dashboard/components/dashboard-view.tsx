import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Target,
  Timer,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/features/dashboard/components/stat-card";
import {
  DeadlineCountdown,
  NextClassCountdown,
} from "@/features/dashboard/components/countdown";
import { LiveClock } from "@/features/dashboard/components/live-clock";
import type { DashboardData } from "@/features/dashboard/queries";
import { formatCurrency, minutesToHours, relativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "Xayrli tun";
  if (hour < 12) return "Xayrli tong";
  if (hour < 18) return "Xayrli kun";
  return "Xayrli kech";
}

export function DashboardView({
  name,
  data,
}: {
  name: string;
  data: DashboardData;
}) {
  const budgetLeft = data.monthlyBudget - data.monthlyExpense;
  const budgetProgress =
    data.monthlyBudget > 0
      ? Math.min(100, Math.round((data.monthlyExpense / data.monthlyBudget) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting()}, {name.split(" ")[0]}! 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Bugungi rejalaringizni ko'rib chiqing.
          </p>
        </div>
        <LiveClock />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Timer}
          label="Study time (bugun)"
          value={minutesToHours(data.studyMinutesToday)}
          hint={`Hafta: ${minutesToHours(data.studyMinutesWeek)}`}
        />
        <StatCard
          icon={GraduationCap}
          label="GPA"
          value={data.gpa ? data.gpa.toFixed(2) : "—"}
          hint="Umumiy baho"
          accent="text-violet-600 bg-violet-500/10 dark:text-violet-400"
        />
        <StatCard
          icon={CheckCircle2}
          label="Davomat"
          value={`${data.attendance}%`}
          hint={`${data.completedHomework}/${data.totalHomework} vazifa`}
          accent="text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"
        />
        <StatCard
          icon={Wallet}
          label="Oylik xarajat"
          value={formatCurrency(data.monthlyExpense)}
          hint={
            data.monthlyBudget > 0
              ? `Qoldi: ${formatCurrency(budgetLeft)}`
              : "Budjet belgilanmagan"
          }
          accent="text-amber-600 bg-amber-500/10 dark:text-amber-400"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="size-4 text-primary" /> Bugungi darslar
              </CardTitle>
              <Link
                href="/schedule"
                className="text-xs text-primary hover:underline"
              >
                Barchasi
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.todaySchedule.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Bugun darslar yo'q. Dam oling! 🎉
                </p>
              ) : (
                data.todaySchedule.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                    style={{ borderLeft: `3px solid ${item.color}` }}
                  >
                    <div className="w-16 shrink-0 text-sm font-medium">
                      {item.startTime}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[item.room, item.teacher].filter(Boolean).join(" · ") ||
                          "—"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.endTime}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4 text-amber-500" /> Yaqin
                deadline'lar
              </CardTitle>
              <Link
                href="/tasks"
                className="text-xs text-primary hover:underline"
              >
                Barchasi
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.upcomingDeadlines.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Yaqin deadline yo'q.
                </p>
              ) : (
                data.upcomingDeadlines.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.href}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {relativeDay(item.deadline)} ·{" "}
                        {item.type === "TASK" ? "Vazifa" : "Vazifa (o'qish)"}
                      </p>
                    </div>
                    <DeadlineCountdown
                      target={item.deadline}
                      className="shrink-0 font-mono text-sm font-semibold text-amber-600 dark:text-amber-400"
                    />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {data.nextClass ? (
            <NextClassCountdown
              title={data.nextClass.title}
              startTime={data.nextClass.startTime}
              room={data.nextClass.room}
            />
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Timer className="size-3.5" /> Keyingi dars
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Bugun boshqa dars yo'q.
              </p>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="size-4 text-primary" /> Bugungi vazifalar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.todayTasks.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Vazifalar yo'q.
                </p>
              ) : (
                data.todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 rounded-lg border border-border p-2.5"
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        task.priority === "HIGH"
                          ? "bg-rose-500"
                          : task.priority === "MEDIUM"
                            ? "bg-amber-500"
                            : "bg-sky-500"
                      )}
                    />
                    <p className="truncate text-sm">{task.title}</p>
                    {task.deadline && (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {relativeDay(task.deadline)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="size-4 text-primary" /> Maqsadlar
              </CardTitle>
              <Link
                href="/goals"
                className="text-xs text-primary hover:underline"
              >
                Barchasi
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.goals.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Maqsadlar yo'q.
                </p>
              ) : (
                data.goals.map((goal) => (
                  <div key={goal.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{goal.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {goal.progress}%
                      </span>
                    </div>
                    <Progress value={goal.progress} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {data.monthlyBudget > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="size-4 text-primary" /> Budjet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sarflandi</span>
                  <span className="font-medium">
                    {formatCurrency(data.monthlyExpense)}
                  </span>
                </div>
                <Progress
                  value={budgetProgress}
                  className={cn(
                    budgetProgress > 90 && "[&>div]:bg-destructive"
                  )}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{budgetProgress}%</span>
                  <span>Qoldi: {formatCurrency(Math.max(0, budgetLeft))}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
