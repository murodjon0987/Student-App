import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { param, queryPage, type ListParams } from "@/lib/pagination";
import { gradeSummary, literalSearch } from "@/lib/list-query";

export async function getGrades(params: ListParams = {}) {
  const { userId } = await verifySession();
  const semester = param(params, "semester");
  const q = param(params, "q");
  const where = {
    userId,
    ...(semester ? { semesterId: semester } : {}),
    ...(q
      ? {
          subjectName: {
            contains: literalSearch(q),
            mode: "insensitive" as const,
          },
        }
      : {}),
  };

  const [result, groups, semesters] = await Promise.all([
    queryPage(params.page, () => prisma.grade.count({ where }),
      (range) => prisma.grade.findMany({ where, ...range, orderBy: [{ createdAt: "desc" }, { id: "desc" }] })),
    prisma.grade.groupBy({ by: ["grade"], where, _sum: { credit: true }, _count: { _all: true } }),
    prisma.semester.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, startDate: true, endDate: true },
    }),
  ]);
  return { ...result, summary: gradeSummary(groups), semesters, activeSemester: semester };
}
