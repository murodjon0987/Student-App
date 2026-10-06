import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";

export async function getGoals() {
  const { userId } = await verifySession();
  return prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      tasks: { orderBy: { order: "asc" } },
    },
  });
}
