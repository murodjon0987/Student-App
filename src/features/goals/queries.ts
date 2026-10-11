import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { param, queryPage, type ListParams } from "@/lib/pagination";
import { literalSearch } from "@/lib/list-query";

export async function getGoals(params: ListParams = {}) {
  const { userId } = await verifySession();
  const q = param(params, "q");
  const where: Prisma.GoalWhereInput = { userId, ...(q ? { title: { contains: literalSearch(q), mode: "insensitive" } } : {}) };
  return queryPage(params.page, () => prisma.goal.count({ where }),
    (range) => prisma.goal.findMany({ where, ...range, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { tasks: { orderBy: [{ order: "asc" }, { id: "asc" }] } } }));
}
