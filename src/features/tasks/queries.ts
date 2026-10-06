import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";

export async function getTasks() {
  const { userId } = await verifySession();
  return prisma.task.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
  });
}
