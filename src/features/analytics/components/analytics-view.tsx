"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { minutesToHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalyticsData } from "@/features/analytics/queries";

interface Props {
  data: AnalyticsData;
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  accent = "text-primary bg-primary/10",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            accent
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export function AnalyticsView({ data }: Props) {
  const hasWeekData = data.last7Days.some((day) => day.minutes > 0);
  const hasMonthData = data.last6Months.some((month) => month.minutes > 0);
  const hasSubjectData = data.minutesBySubject.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tahlillar"
        description="O'qish vaqti, vazifalar va maqsadlar bo'yicha statistika."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Clock}
          label="Bugun"
          value={minutesToHours(data.studyMinutesToday)}
          hint="O'qishga sarflangan vaqt"
        />
        <Stat
          icon={CalendarDays}
          label="Bu hafta"
          value={minutesToHours(data.studyMinutesWeek)}
          hint="Haftalik jami"
          accent="text-sky-600 bg-sky-500/10 dark:text-sky-400"
        />
        <Stat
          icon={TrendingUp}
          label="Bu oy"
          value={minutesToHours(data.studyMinutesMonth)}
          hint="Oylik jami"
          accent="text-violet-600 bg-violet-500/10 dark:text-violet-400"
        />
        <Stat
          icon={CheckCircle2}
          label="Bajarilgan vazifalar"
          value={String(data.completedTasks.total)}
          hint={`Bu hafta: ${data.completedTasks.thisWeek}`}
          accent="text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4 text-primary" /> So'nggi 7 kun
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasWeekData ? (
            <EmptyState
              icon={BarChart3}
              title="Ma'lumot yo'q"
              description="Bu hafta o'qish seanslari qayd etilmagan."
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.last7Days}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), "d/M")}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip
                    formatter={(value) => minutesToHours(Number(value))}
                    labelFormatter={(value) =>
                      format(new Date(String(value)), "d MMM")
                    }
                  />
                  <Bar
                    dataKey="minutes"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" /> So'nggi 6 oy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasMonthData ? (
              <EmptyState
                icon={TrendingUp}
                title="Ma'lumot yo'q"
                description="Oylik statistika hali shakllanmagan."
              />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.last6Months}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="label"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                    />
                    <Tooltip formatter={(value) => minutesToHours(Number(value))} />
                    <Line
                      type="monotone"
                      dataKey="minutes"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-primary" /> Fanlar bo'yicha
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasSubjectData ? (
              <EmptyState
                icon={Clock}
                title="Ma'lumot yo'q"
                description="Fanlar bo'yicha vaqt taqsimlanmagan."
              />
            ) : (
              <div className="space-y-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.minutesBySubject}
                        dataKey="minutes"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {data.minutesBySubject.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => minutesToHours(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {data.minutesBySubject.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="flex-1 truncate">{item.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {minutesToHours(item.minutes)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="size-4 text-primary" /> Maqsadlar jarayoni
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.goals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Maqsadlar yo'q"
              description="Maqsadlar qo'shsangiz, jarayon shu yerda ko'rinadi."
            />
          ) : (
            <div className="space-y-4">
              {data.goals.map((goal) => (
                <div key={goal.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: goal.color }}
                      />
                      {goal.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {goal.done}/{goal.total} · {goal.progress}%
                    </span>
                  </div>
                  <Progress value={goal.progress} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
