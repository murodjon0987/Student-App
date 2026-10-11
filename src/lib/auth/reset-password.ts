import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashResetToken } from "./security";

/** Consume the token and revoke sessions atomically, even for concurrent resets. */
export async function completePasswordReset(token: string, passwordHash: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const record = await tx.passwordResetToken.findUnique({
          where: { tokenHash: hashResetToken(token) },
        });
        const now = new Date();
        if (!record || record.usedAt || record.expiresAt <= now) return false;

        const consumed = await tx.passwordResetToken.updateMany({
          where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
          data: { usedAt: now },
        });
        if (consumed.count !== 1) return false;

        await tx.user.update({
          where: { id: record.userId },
          data: { passwordHash, sessionVersion: { increment: 1 } },
        });
        await tx.passwordResetToken.updateMany({
          where: { userId: record.userId, usedAt: null },
          data: { usedAt: now },
        });
        return true;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  return false;
}
