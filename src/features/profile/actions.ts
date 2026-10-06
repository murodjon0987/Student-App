"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/types";
import { profileSchema, type ProfileInput } from "./schema";

export async function updateProfile(
  input: ProfileInput
): Promise<ActionResult> {
  const { userId } = await verifySession();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const data = parsed.data;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        avatarUrl: data.avatarUrl || null,
      },
    });

    await prisma.studentProfile.upsert({
      where: { userId },
      create: {
        userId,
        university: data.university ?? null,
        faculty: data.faculty ?? null,
        course: data.course ?? null,
        group: data.group ?? null,
        bio: data.bio ?? null,
      },
      update: {
        university: data.university ?? null,
        faculty: data.faculty ?? null,
        course: data.course ?? null,
        group: data.group ?? null,
        bio: data.bio ?? null,
      },
    });

    revalidatePath("/", "layout");
    return ok();
  } catch {
    return fail("Saqlashda xatolik yuz berdi");
  }
}
