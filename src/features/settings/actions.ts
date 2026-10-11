"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { deleteSession } from "@/lib/auth/session";
import { deleteUserContent } from "@/lib/user-data";
import { fail, ok, type ActionResult } from "@/lib/types";
import { settingsSchema, type SettingsInput } from "./schema";

export async function updateSettings(
  input: SettingsInput
): Promise<ActionResult> {
  const { userId } = await verifySession();

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const data = parsed.data;

  try {
    await prisma.studentProfile.upsert({
      where: { userId },
      create: {
        userId,
        language: data.language,
        theme: data.theme,
        notificationsEnabled: data.notificationsEnabled,
        monthlyBudget: data.monthlyBudget,
      },
      update: {
        language: data.language,
        theme: data.theme,
        notificationsEnabled: data.notificationsEnabled,
        monthlyBudget: data.monthlyBudget,
      },
    });

    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}

export async function deleteAllData(): Promise<ActionResult> {
  const { userId } = await verifySession();

  try {
    await deleteUserContent(userId);

    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("O'chirishda xatolik yuz berdi");
  }
}

export async function deleteAccount(): Promise<void> {
  const { userId } = await verifySession();

  await prisma.user.delete({ where: { id: userId } });
  await deleteSession();

  redirect("/login");
}
