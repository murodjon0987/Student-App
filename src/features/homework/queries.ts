import "server-only";

import { Prisma, type Homework } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { param, queryPage, type ListParams } from "@/lib/pagination";
import { todoWhere } from "@/lib/list-query";

export async function getHomework(params: ListParams = {}) {
  const { userId } = await verifySession();
  const where = todoWhere(userId, params);
  const sort = param(params, "sort", "deadline");
  const conditions = [Prisma.sql`"userId" = ${userId}`];
  const status = param(params, "status");
  const priority = param(params, "priority");
  if (where.status) conditions.push(Prisma.sql`"status" = ${status}`);
  if (where.priority) conditions.push(Prisma.sql`"priority" = ${priority}`);
  if (where.title) conditions.push(Prisma.sql`POSITION(LOWER(${param(params, "q")}) IN LOWER("title")) > 0`);
  return queryPage(params.page,
    () => prisma.homework.count({ where }),
    ({ skip, take }) => sort === "priority"
      ? prisma.$queryRaw<Homework[]>(Prisma.sql`SELECT * FROM "Homework" WHERE ${Prisma.join(conditions, " AND ")} ORDER BY CASE "priority" WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END, "createdAt" DESC, "id" DESC OFFSET ${skip} LIMIT ${take}`)
      : prisma.homework.findMany({ where, skip, take, orderBy: sort === "created"
        ? [{ createdAt: "desc" }, { id: "desc" }]
        : [{ deadline: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }, { id: "desc" }] }),
  );
}
