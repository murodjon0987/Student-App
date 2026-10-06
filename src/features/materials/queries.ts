import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";

export async function getMaterials() {
  const { userId } = await verifySession();
  return prisma.material.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
  });
}
