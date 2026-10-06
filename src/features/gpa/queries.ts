import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";

export async function getGrades() {
  const { userId } = await verifySession();
  return prisma.grade.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
