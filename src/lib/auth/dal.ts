import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedSession } from "./session";

export const verifySession = cache(async () => {
  const session = await getAuthenticatedSession();

  if (!session?.userId) {
    redirect("/login");
  }

  return { isAuth: true as const, userId: session.userId };
});

export const getCurrentUser = cache(async () => {
  const { userId } = await verifySession();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    redirect("/login");
  }

  return user;
});

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;
