"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import { eventSchema, type EventInput } from "./schema";

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function saveEvent(
  input: EventInput
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await verifySession();

  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const data = parsed.data;
  const start = parseDate(data.start);
  if (!start) return fail("Boshlanish vaqti noto'g'ri");
  const end = parseDate(data.end);

  try {
    if (data.id) {
      const existing = await prisma.event.findFirst({
        where: { id: data.id, userId },
      });
      if (!existing) return fail("Tadbir topilmadi");

      await prisma.event.update({
        where: { id: data.id },
        data: {
          title: data.title,
          description: data.description ?? null,
          type: data.type,
          start,
          end,
          allDay: data.allDay,
          color: data.color,
        },
      });
      revalidatePath("/", "layout");
      return ok({ id: data.id });
    }

    const created = await prisma.event.create({
      data: {
        userId,
        title: data.title,
        description: data.description ?? null,
        type: data.type,
        start,
        end,
        allDay: data.allDay,
        color: data.color,
      },
    });
    revalidatePath("/", "layout");
    return ok({ id: created.id });
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const { userId } = await verifySession();

  const existing = await prisma.event.findFirst({ where: { id, userId } });
  if (!existing) return fail("Tadbir topilmadi");

  try {
    await prisma.event.delete({ where: { id } });
    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik yuz berdi");
  }
}
