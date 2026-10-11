import "server-only";

import { DAY_MS, dayRange, weekRange, monthRange, monthKey, localDateKey, shiftMonth } from "@/lib/date";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { MONTHS_UZ } from "@/lib/format";

export async function getAnalytics() {
  const { userId } = await verifySession();
  const now = new Date();

  const { start: todayStart, end: todayEnd } = dayRange(now);
  const { start: weekStart, end: weekEnd } = weekRange(now);
  const { start: monthStart, end: monthEnd } = monthRange(monthKey(now));
  const sixMonthsStart = monthRange(shiftMonth(monthKey(now), -5)).start;

  const [sessions, subjects, completedTotal, completedThisWeek, goals] =
    await Promise.all([
      prisma.studySession.findMany({
        where: { userId, startedAt: { gte: sixMonthsStart } },
        select: { durationMin: true, startedAt: true, subjectId: true },
      }),
      prisma.subject.findMany({ where: { userId } }),
      prisma.task.count({ where: { userId, status: "COMPLETED" } }),
      prisma.task.count({
        where: {
          userId,
          status: "COMPLETED",
          completedAt: { gte: weekStart, lte: weekEnd },
        },
      }),
      prisma.goal.findMany({
        where: { userId },
        include: { tasks: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const inRange = (date: Date, start: Date, end: Date) =>
    date >= start && date <= end;
  const sum = (list: { durationMin: number }[]) =>
    list.reduce((total, item) => total + item.durationMin, 0);

  const todaySessions = sessions.filter((session) =>
    inRange(session.startedAt, todayStart, todayEnd)
  );
  const weekSessions = sessions.filter((session) =>
    inRange(session.startedAt, weekStart, weekEnd)
  );
  const monthSessions = sessions.filter((session) =>
    inRange(session.startedAt, monthStart, monthEnd)
  );

  const dailyMap = new Map<string, number>();
  for (const session of sessions) {
    const key = localDateKey(session.startedAt);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + session.durationMin);
  }
  const last7Days = Array.from({ length: 7 }, (_, index) => {
    const key = localDateKey(new Date(now.getTime() - (6 - index) * DAY_MS));
    return { date: key, minutes: dailyMap.get(key) ?? 0 };
  });

  const monthlyMap = new Map<string, number>();
  for (const session of sessions) {
    const key = monthKey(session.startedAt);
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + session.durationMin);
  }
  const last6Months = Array.from({ length: 6 }, (_, index) => {
    const key = shiftMonth(monthKey(now), index - 5);
    return {
      month: key,
      label: MONTHS_UZ[Number(key.slice(5)) - 1],
      minutes: monthlyMap.get(key) ?? 0,
    };
  });

  const subjectMap = new Map<string, number>();
  for (const session of sessions) {
    const key = session.subjectId ?? "none";
    subjectMap.set(key, (subjectMap.get(key) ?? 0) + session.durationMin);
  }
  const minutesBySubject = Array.from(subjectMap.entries())
    .map(([id, minutes]) => {
      const subject = subjects.find((item) => item.id === id);
      return {
        name: subject?.name ?? "Fan belgilanmagan",
        minutes,
        color: subject?.color ?? "#64748b",
      };
    })
    .filter((item) => item.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  const goalsProgress = goals.map((goal) => {
    const total = goal.tasks.length;
    const done = goal.tasks.filter((task) => task.done).length;
    return {
      id: goal.id,
      title: goal.title,
      color: goal.color,
      done,
      total,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  return {
    studyMinutesToday: sum(todaySessions),
    studyMinutesWeek: sum(weekSessions),
    studyMinutesMonth: sum(monthSessions),
    last7Days,
    last6Months,
    minutesBySubject,
    completedTasks: {
      total: completedTotal,
      thisWeek: completedThisWeek,
    },
    goals: goalsProgress,
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;
