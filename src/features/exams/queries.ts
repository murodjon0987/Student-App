import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";

export async function getExams() {
  const { userId } = await verifySession();
  return prisma.exam.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });
}
