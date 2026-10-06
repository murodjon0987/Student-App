import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";

export async function getNotes() {
  const { userId } = await verifySession();
  return prisma.note.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }],
  });
}
