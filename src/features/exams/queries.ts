import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { param, queryPage, type ListParams } from "@/lib/pagination";
import { literalSearch } from "@/lib/list-query";

export async function getExams(params: ListParams = {}) {
  const { userId } = await verifySession();
  const q = param(params, "q");
  const where: Prisma.ExamWhereInput = { userId, ...(q ? { title: { contains: literalSearch(q), mode: "insensitive" } } : {}) };
  return queryPage(params.page, () => prisma.exam.count({ where }),
    (range) => prisma.exam.findMany({ where, ...range, orderBy: [{ date: "asc" }, { id: "asc" }] }));
}
