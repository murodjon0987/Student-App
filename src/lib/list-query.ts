import type { Prisma } from "@prisma/client";
import { param, type ListParams } from "@/lib/pagination";

// PostgreSQL LIKE treats these characters specially. Search inputs are literal text.
export function literalSearch(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function todoWhere(userId: string, params: ListParams) {
  const status = param(params, "status");
  const priority = param(params, "priority");
  const q = param(params, "q");
  return {
    userId,
    ...(["PENDING", "IN_PROGRESS", "COMPLETED"].includes(status) ? { status } : {}),
    ...(["HIGH", "MEDIUM", "LOW"].includes(priority) ? { priority } : {}),
    ...(q ? { title: { contains: literalSearch(q), mode: "insensitive" as const } } : {}),
  };
}

export function noteWhere(userId: string, params: ListParams): Prisma.NoteWhereInput {
  const q = param(params, "q");
  const tag = param(params, "tag");
  return { userId, ...(tag ? { tags: { has: tag } } : {}), ...(q ? { OR: [
    { title: { contains: literalSearch(q), mode: "insensitive" as const } },
    { content: { contains: literalSearch(q), mode: "insensitive" as const } },
    { tags: { has: q } },
  ] } : {}) };
}

export function materialWhere(userId: string, params: ListParams): Prisma.MaterialWhereInput {
  const q = param(params, "q");
  const category = param(params, "category");
  return { userId,
    ...(["PROGRAMMING", "MATHEMATICS", "PHYSICS", "ENGLISH", "OTHER"].includes(category) ? { category } : {}),
    ...(q ? { OR: [ { title: { contains: literalSearch(q), mode: "insensitive" as const } }, { description: { contains: literalSearch(q), mode: "insensitive" as const } } ] } : {}),
  };
}

export function gradeSummary(groups: { grade: string; _sum: { credit: number | null }; _count: { _all: number } }[]) {
  let totalCredits = 0;
  let weighted = 0;
  let totalGrades = 0;
  let count = 0;
  for (const group of groups) {
    const grade = Number(group.grade);
    if (!Number.isFinite(grade)) continue;
    const credit = group._sum.credit ?? 0;
    totalCredits += credit;
    weighted += grade * credit;
    totalGrades += grade * group._count._all;
    count += group._count._all;
  }
  const round2 = (value: number) => Math.round(value * 100) / 100;
  return { totalCredits, gpa: totalCredits > 0 ? round2(weighted / totalCredits) : 0, average: count > 0 ? round2(totalGrades / count) : 0 };
}
