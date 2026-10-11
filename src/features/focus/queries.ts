import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { queryPage, type ListParams } from "@/lib/pagination";
import { dayRange, weekRange } from "@/lib/date";

export async function getFocusData(params: ListParams = {}) {
  const { userId } = await verifySession();

  const now = new Date();
  const day = dayRange(now), week = weekRange(now);

  const [result, todayAgg, weekAgg] = await Promise.all([
    queryPage(params.page, () => prisma.studySession.count({ where: { userId } }),
      (range) => prisma.studySession.findMany({ where: { userId }, ...range, orderBy: [{ startedAt: "desc" }, { id: "desc" }] })),
    prisma.studySession.aggregate({
      where: { userId, startedAt: { gte: day.start, lte: day.end } },
      _sum: { durationMin: true },
    }),
    prisma.studySession.aggregate({
      where: { userId, startedAt: { gte: week.start, lte: week.end } },
      _sum: { durationMin: true },
    }),
  ]);

  return {
    sessions: result.items,
    pagination: result.pagination,
    sessionCount: result.pagination.total,
    todayMinutes: todayAgg._sum.durationMin ?? 0,
    weekMinutes: weekAgg._sum.durationMin ?? 0,
  };
}

export type FocusData = Awaited<ReturnType<typeof getFocusData>>;
export type FocusSession = FocusData["sessions"][number];
