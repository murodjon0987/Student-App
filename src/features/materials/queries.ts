import "server-only";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { queryPage, type ListParams } from "@/lib/pagination";
import { materialWhere } from "@/lib/list-query";

export async function getMaterials(params: ListParams = {}) {
  const { userId } = await verifySession();
  const where = materialWhere(userId, params);
  return queryPage(params.page, () => prisma.material.count({ where }),
    (range) => prisma.material.findMany({ where, ...range, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }));
}
