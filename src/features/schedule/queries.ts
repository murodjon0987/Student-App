import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";

export async function getSubjects() {
  const { userId } = await verifySession();
  return prisma.subject.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function getSchedule() {
  const { userId } = await verifySession();
  return prisma.schedule.findMany({
    where: { userId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}
