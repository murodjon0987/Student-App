import "server-only";

import { prisma } from "@/lib/prisma";
import type { AttachmentMeta, AttachmentParent } from "./types";

export type { AttachmentMeta, AttachmentParent } from "./types";

function parentWhere(
  parent: AttachmentParent
): { homeworkId: string } | { noteId: string } | { materialId: string } | null {
  if (parent.homeworkId) return { homeworkId: parent.homeworkId };
  if (parent.noteId) return { noteId: parent.noteId };
  if (parent.materialId) return { materialId: parent.materialId };
  return null;
}

/** Metadata only — never selects the binary `data` field. */
export async function listAttachments(
  userId: string,
  parent: AttachmentParent
): Promise<AttachmentMeta[]> {
  const where = parentWhere(parent);
  if (!where) return [];
  return prisma.attachment.findMany({
    where: { userId, ...where },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      mimeType: true,
      type: true,
      size: true,
      createdAt: true,
    },
  });
}

export async function getAttachmentFile(userId: string, id: string) {
  return prisma.attachment.findFirst({
    where: { id, userId },
    select: { data: true, mimeType: true, name: true },
  });
}
