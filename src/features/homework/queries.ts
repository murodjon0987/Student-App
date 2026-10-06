import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";

export async function getHomework() {
  const { userId } = await verifySession();
  return prisma.homework.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
  });
}
