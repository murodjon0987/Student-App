import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";

export async function getFocusData() {
  const { userId } = await verifySession();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  const dayIndex = (startOfWeek.getDay() + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - dayIndex);

  const [sessionsToday, sessions, todayAgg, weekAgg] = await Promise.all([
    prisma.studySession.findMany({
      where: { userId, startedAt: { gte: startOfToday } },
      orderBy: { startedAt: "desc" },
      take: 8,
    }),
    prisma.studySession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
    }),
    prisma.studySession.aggregate({
      where: { userId, startedAt: { gte: startOfToday } },
      _sum: { durationMin: true },
    }),
    prisma.studySession.aggregate({
      where: { userId, startedAt: { gte: startOfWeek } },
      _sum: { durationMin: true },
    }),
  ]);

  return {
    sessionsToday,
    sessions,
    todayMinutes: todayAgg._sum.durationMin ?? 0,
    weekMinutes: weekAgg._sum.durationMin ?? 0,
  };
}

export type FocusData = Awaited<ReturnType<typeof getFocusData>>;
export type FocusSession = FocusData["sessions"][number];
