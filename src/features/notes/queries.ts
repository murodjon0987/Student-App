import "server-only";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { queryPage, type ListParams } from "@/lib/pagination";
import { noteWhere } from "@/lib/list-query";

export async function getNotes(params: ListParams = {}) {
  const { userId } = await verifySession();
  const where = noteWhere(userId, params);
  return queryPage(params.page, () => prisma.note.count({ where }),
    (range) => prisma.note.findMany({ where, ...range, orderBy: [{ updatedAt: "desc" }, { id: "desc" }] }));
}
