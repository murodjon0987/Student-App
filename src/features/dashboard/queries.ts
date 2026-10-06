import "server-only";

import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";

function jsWeekdayToApp(day: number) {
  return day === 0 ? 7 : day;
}

export async function getDashboardData() {
  const { userId } = await verifySession();
  const now = new Date();
  const today = jsWeekdayToApp(now.getDay());

  const [
    todaySchedule,
    tasks,
    homeworks,
    goals,
    studyToday,
    studyWeek,
    grades,
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
    }),
    prisma.homework.findMany({
      where: { userId },
      orderBy: { deadline: "asc" },
    }),
    prisma.goal.findMany({
      where: { userId },
      include: { tasks: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.studySession.aggregate({
      where: {
        userId,
        startedAt: { gte: startOfDay(now), lte: endOfDay(now) },
      },
      _sum: { durationMin: true },
    }),
    prisma.studySession.aggregate({
      where: {
        userId,
        startedAt: {
          gte: startOfWeek(now, { weekStartsOn: 1 }),
          lte: endOfWeek(now, { weekStartsOn: 1 }),
        },
      },
      _sum: { durationMin: true },
    }),
    prisma.grade.findMany({ where: { userId } }),
    prisma.expense.aggregate({
      where: {
        userId,
        date: { gte: startOfMonth(now), lte: endOfMonth(now) },
      },
      _sum: { amount: true },
    }),
    prisma.budget.findUnique({
      where: {
        userId_month: {
          userId,
          month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        },
      },
    }),
    prisma.studentProfile.findUnique({ where: { userId } }),
  ]);

  const gpa =
    grades.length > 0
      ? grades.reduce((sum, g) => sum + Number(g.grade) * g.credit, 0) /
        grades.reduce((sum, g) => sum + g.credit, 0)
      : 0;

  const totalHomework = homeworks.length;
  const completedHomework = homeworks.filter(
    (h) => h.status === "COMPLETED"
  ).length;

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
    ...tasks
      .filter((t) => t.deadline)
      .map((t) => ({
        id: t.id,
        title: t.title,
        type: "TASK" as const,
        deadline: t.deadline as Date,
        href: "/tasks",
      })),
    ...homeworks
      .filter((h) => h.deadline && h.status !== "COMPLETED")
      .map((h) => ({
        id: h.id,
        title: h.title,
        type: "HOMEWORK" as const,
        deadline: h.deadline as Date,
        href: "/homework",
      })),
  ]
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .slice(0, 5);

  const todayTasks = tasks.slice(0, 5);

  const nowHHmm = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

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
    attendance: totalHomework > 0 ? Math.round((completedHomework / totalHomework) * 100) : 100,
    completedHomework,
    totalHomework,
    monthlyExpense: expenses._sum.amount ?? 0,
    monthlyBudget: budget?.amount ?? profile?.monthlyBudget ?? 0,
    goals: goalsWithProgress,
    totalGoals: goals.length,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
