"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import {
  MAX_ATTACHMENTS_PER_ITEM,
  MAX_ATTACHMENT_BYTES,
  attachmentKindLabel,
  detectAttachmentMime,
  sanitizeFileName,
} from "./file-type";

type ParentField = "homeworkId" | "noteId" | "materialId";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function parentWhere(id: string, name: ParentField) {
  if (name === "homeworkId") return { homeworkId: id };
  if (name === "noteId") return { noteId: id };
  return { materialId: id };
}

async function parentBelongsToUser(
  userId: string,
  id: string,
  name: ParentField
): Promise<boolean> {
  const select = { id: true };
  if (name === "homeworkId") {
    return Boolean(
      await prisma.homework.findFirst({ where: { id, userId }, select })
    );
  }
  if (name === "noteId") {
    return Boolean(await prisma.note.findFirst({ where: { id, userId }, select }));
  }
  return Boolean(
    await prisma.material.findFirst({ where: { id, userId }, select })
  );
}

export async function uploadAttachment(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fail("Fayl tanlanmadi");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return fail("Fayl hajmi 8 MB dan oshmasligi kerak");
  }

  const candidates: { id: string; name: ParentField }[] = [];
  for (const name of ["homeworkId", "noteId", "materialId"] as ParentField[]) {
    const id = field(formData, name);
    if (id) candidates.push({ id, name });
  }
  if (candidates.length !== 1) {
    return fail("Biriktirish manbasi aniqlanmadi");
  }
  const parent = candidates[0];

  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const mimeType = detectAttachmentMime(data);
    if (!mimeType) {
      return fail("Faqat PDF, DOCX yoki rasm yuklash mumkin");
    }

    if (!(await parentBelongsToUser(userId, parent.id, parent.name))) {
      return fail("Manba topilmadi");
    }

    const count = await prisma.attachment.count({
      where: { userId, ...parentWhere(parent.id, parent.name) },
    });
    if (count >= MAX_ATTACHMENTS_PER_ITEM) {
      return fail(`Ko'pi bilan ${MAX_ATTACHMENTS_PER_ITEM} ta fayl yuklash mumkin`);
    }

    const created = await prisma.attachment.create({
      data: {
        userId,
        name: sanitizeFileName(file.name),
        data,
        mimeType,
        type: attachmentKindLabel(mimeType),
        size: data.length,
        ...parentWhere(parent.id, parent.name),
      },
      select: { id: true },
    });
    revalidatePath("/", "layout");
    return ok({ id: created.id });
  } catch {
    return fail("Faylni saqlashda xatolik");
  }
}

export async function deleteAttachment(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  try {
    const existing = await prisma.attachment.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) return fail("Fayl topilmadi");

    await prisma.attachment.delete({ where: { id, userId } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("Faylni o'chirishda xatolik");
  }
}
