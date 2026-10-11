import { prisma } from "@/lib/prisma";

type SubjectLookup = {
  subject: {
    findFirst(args: {
      where: { id: string; userId: string };
      select: { id: true };
    }): PromiseLike<{ id: string } | null>;
  };
};

/** Optional relations are allowed, but an existing subject must belong to this user. */
export async function ownsSubject(
  userId: string,
  subjectId: string | null | undefined,
  db: SubjectLookup = prisma
): Promise<boolean> {
  if (!subjectId) return true;

  const subject = await db.subject.findFirst({
    where: { id: subjectId, userId },
    select: { id: true },
  });
  return subject !== null;
}
