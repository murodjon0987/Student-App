"use server";

import { createHash, randomBytes } from "node:crypto";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  ForgotPasswordSchema,
  LoginSchema,
  ResetPasswordSchema,
  SignupSchema,
  type AuthFormState,
} from "./definitions";
import { hashPassword, verifyPassword } from "./password";
import { createSession, deleteSession } from "./session";

export async function register(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const validated = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, email, password } = validated.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: ["Bu email allaqachon ro'yxatdan o'tgan"] } };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      profile: { create: {} },
      subjects: {
        create: [
          { name: "Matematika", teacher: "A. Karimov", color: "#6366f1" },
          { name: "Dasturlash", teacher: "B. Yusupov", color: "#8b5cf6" },
          { name: "Ingliz tili", teacher: "C. Smith", color: "#0ea5e9" },
        ],
      },
    },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function login(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, password } = validated.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { message: "Email yoki parol noto'g'ri" };
  }

  if (!user.passwordHash) {
    return {
      message:
        "Bu hisob Google orqali yaratilgan. Iltimos, Google bilan kiring.",
    };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { message: "Email yoki parol noto'g'ri" };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function forgotPassword(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const validated = ForgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email } = validated.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Email mavjudligini oshkor qilmaymiz.
  if (!user) {
    return {
      success: true,
      message: "Agar bu email ro'yxatdan o'tgan bo'lsa, tiklash havolasi yuboriladi.",
    };
  }

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const resetUrl = `/reset-password?token=${token}`;

  // Email xizmati ulanmagani uchun havolani qaytaramiz (dev rejim).
  return {
    success: true,
    message: "Tiklash havolasi tayyor.",
    errors: { __debug: [resetUrl] },
  };
}

export async function resetPassword(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const validated = ResetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { token, password } = validated.data;

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { message: "Havola yaroqsiz yoki muddati o'tgan." };
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  redirect("/login?reset=1");
}
