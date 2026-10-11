import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { param, queryPage, type ListParams } from "@/lib/pagination";
import { literalSearch } from "@/lib/list-query";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/constants";

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attended: number;
  missed: number;
  rate: number;
}

export function summarizeAttendance(
  groups: { status: string; _count: { _all: number } }[]
): AttendanceSummary {
  const counts: Record<AttendanceStatus, number> = {
    PRESENT: 0,
    ABSENT: 0,
    LATE: 0,
    EXCUSED: 0,
  };
  let total = 0;
  for (const group of groups) {
    const count = group._count._all;
    total += count;
    if ((ATTENDANCE_STATUSES as string[]).includes(group.status)) {
      counts[group.status as AttendanceStatus] = count;
    }
  }
  const attended = counts.PRESENT + counts.LATE;
  return {
    total,
    present: counts.PRESENT,
    absent: counts.ABSENT,
    late: counts.LATE,
    excused: counts.EXCUSED,
    attended,
    missed: counts.ABSENT,
    rate: total > 0 ? Math.round((attended / total) * 100) : 0,
  };
}

export async function getAttendance(params: ListParams = {}) {
  const { userId } = await verifySession();
  const status = param(params, "status");
  const subjectId = param(params, "subject");
  const q = param(params, "q");
  const where = {
    userId,
    ...((ATTENDANCE_STATUSES as string[]).includes(status) ? { status } : {}),
    ...(subjectId ? { subjectId } : {}),
    ...(q
      ? {
          subject: {
            is: {
              name: { contains: literalSearch(q), mode: "insensitive" as const },
            },
          },
        }
      : {}),
  };

  const [result, groups, subjects] = await Promise.all([
    queryPage(params.page, () => prisma.attendance.count({ where }),
      (range) =>
        prisma.attendance.findMany({
          where,
          ...range,
          orderBy: [{ date: "desc" }, { id: "desc" }],
          include: { subject: { select: { name: true, color: true } } },
        })),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.subject.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  return { ...result, summary: summarizeAttendance(groups), subjects };
}
