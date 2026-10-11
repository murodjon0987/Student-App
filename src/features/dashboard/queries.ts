import "server-only";

import { appDateParts, dayRange, weekRange, monthRange, monthKey } from "@/lib/date";
import { formatTime } from "@/lib/format";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { summarizeAttendance } from "@/features/attendance/queries";

function jsWeekdayToApp(day: number) {
  return day === 0 ? 7 : day;
}

export async function getDashboardData() {
  const { userId } = await verifySession();
  const now = new Date();
  const today = jsWeekdayToApp(appDateParts(now).weekday);
  const day = dayRange(now), week = weekRange(now), month = monthRange(monthKey(now));

  const [
    todaySchedule,
    todayTasks,
    taskDeadlines,
    homeworkDeadlines,
    homeworkGroups,
    attendanceGroups,
    goals,
    studyToday,
    studyWeek,
    gradeGroups,
    expenses,
    budget,
    profile,
  ] = await Promise.all([
    prisma.schedule.findMany({
      where: { userId, dayOfWeek: today },
      orderBy: { startTime: "asc" },
    }),
    prisma.task.findMany({
      where: { userId, status: { not: "COMPLETED" } },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
      take: 5,
      select: { id: true, title: true, priority: true, deadline: true },
    }),
    prisma.task.findMany({
      where: { userId, status: { not: "COMPLETED" }, deadline: { not: null } },
      orderBy: { deadline: "asc" },
      take: 8,
      select: { id: true, title: true, deadline: true },
    }),
    prisma.homework.findMany({
      where: { userId, status: { not: "COMPLETED" }, deadline: { not: null } },
      orderBy: { deadline: "asc" },
      take: 8,
      select: { id: true, title: true, deadline: true },
    }),
    prisma.homework.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.goal.findMany({
      where: { userId },
      include: { tasks: { select: { done: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.studySession.aggregate({
      where: {
        userId,
        startedAt: { gte: day.start, lte: day.end },
      },
      _sum: { durationMin: true },
    }),
    prisma.studySession.aggregate({
      where: {
        userId,
        startedAt: {
          gte: week.start,
          lte: week.end,
        },
      },
      _sum: { durationMin: true },
    }),
    prisma.grade.groupBy({
      by: ["grade"],
      where: { userId },
      _sum: { credit: true },
      _count: { _all: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId,
        date: { gte: month.start, lte: month.end },
      },
      _sum: { amount: true },
    }),
    prisma.budget.findUnique({
      where: {
        userId_month: {
          userId,
          month: monthKey(now),
        },
      },
    }),
    prisma.studentProfile.findUnique({ where: { userId } }),
  ]);

  let gradeCredits = 0;
  let gradeWeighted = 0;
  for (const group of gradeGroups) {
    const value = Number(group.grade);
    if (!Number.isFinite(value)) continue;
    const credit = group._sum.credit ?? 0;
    gradeCredits += credit;
    gradeWeighted += value * credit;
  }
  const gpa = gradeCredits > 0 ? gradeWeighted / gradeCredits : 0;

  let homeworkTotal = 0;
  let homeworkCompleted = 0;
  for (const group of homeworkGroups) {
    homeworkTotal += group._count._all;
    if (group.status === "COMPLETED") homeworkCompleted += group._count._all;
  }
  const homeworkCompletion =
    homeworkTotal > 0 ? Math.round((homeworkCompleted / homeworkTotal) * 100) : 100;

  const attendance = summarizeAttendance(attendanceGroups);

  const goalsWithProgress = goals.map((goal) => {
    const total = goal.tasks.length;
    const done = goal.tasks.filter((t) => t.done).length;
    return {
      id: goal.id,
      title: goal.title,
      color: goal.color,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  const upcomingDeadlines = [
    ...taskDeadlines.map((t) => ({
      id: t.id,
      title: t.title,
      type: "TASK" as const,
      deadline: t.deadline as Date,
      href: "/tasks",
    })),
    ...homeworkDeadlines.map((h) => ({
      id: h.id,
      title: h.title,
      type: "HOMEWORK" as const,
      deadline: h.deadline as Date,
      href: "/homework",
    })),
  ]
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .slice(0, 5);

  const nowHHmm = formatTime(now);

  const nextClass =
    todaySchedule.find((item) => item.startTime > nowHHmm) ?? null;

  return {
    todaySchedule,
    nextClass,
    upcomingDeadlines,
    todayTasks,
    studyMinutesToday: studyToday._sum.durationMin ?? 0,
    studyMinutesWeek: studyWeek._sum.durationMin ?? 0,
    gpa,
    homeworkCompletion,
    homeworkCompleted,
    homeworkTotal,
    attendanceRate: attendance.total > 0 ? attendance.rate : null,
    attendanceTotal: attendance.total,
    attendanceMissed: attendance.missed,
    monthlyExpense: expenses._sum.amount ?? 0,
    monthlyBudget: budget?.amount ?? profile?.monthlyBudget ?? 0,
    goals: goalsWithProgress,
    totalGoals: goals.length,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
