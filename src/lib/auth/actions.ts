"use server";

import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";

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
import { limitAuthRequest } from "@/lib/rate-limit";
import { hashResetToken, safeNextPath } from "./security";
import { isResetEmailConfigured, sendPasswordResetEmail } from "./email";
import { completePasswordReset } from "./reset-password";

const LIMIT_MESSAGE = "Juda ko'p urinish. Biroz kutib, qaytadan urinib ko'ring.";

async function authRequestError(scope: string, identifier: string, limit?: number): Promise<AuthFormState> {
  try {
    return await limitAuthRequest(scope, identifier, limit) ? undefined : { message: LIMIT_MESSAGE };
  } catch {
    console.error(`[auth/${scope}] rate limit storage unavailable`);
    return { message: "Xizmatga ulanib bo'lmadi. Keyinroq qaytadan urinib ko'ring." };
  }
}

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
  const requestError = await authRequestError("register", email, 5);
  if (requestError) return requestError;

  try {
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

    try {
      await createSession(user.id);
    } catch {
      console.error("[auth/register] session creation failed");
      return { message: "Hisob yaratildi. Tizimga kirish sahifasidan qaytadan kiring." };
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { email: ["Bu email allaqachon ro'yxatdan o'tgan"] } };
    }
    console.error("[auth/register] registration failed");
    return { message: "Ro'yxatdan o'tishda xatolik. Keyinroq qaytadan urinib ko'ring." };
  }
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
  const requestError = await authRequestError("login", email);
  if (requestError) return requestError;

  try {
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

    await createSession(user.id, user.sessionVersion);
  } catch {
    console.error("[auth/login] sign in failed");
    return { message: "Tizimga kirishda xatolik. Qaytadan urinib ko'ring." };
  }
  redirect(safeNextPath(formData.get("next")));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
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
  const requestError = await authRequestError("forgot-password", email, 3);
  if (requestError) return requestError;
  if (!isResetEmailConfigured()) {
    return { message: "Email orqali parol tiklash hozircha mavjud emas. Administrator bilan bog'laning." };
  }

  // Return the same response for known/unknown accounts and delivery failures.
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      const token = randomBytes(32).toString("hex");
      const record = await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashResetToken(token),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      try {
        await sendPasswordResetEmail(email, token, record.id);
      } catch {
        await prisma.passwordResetToken.deleteMany({ where: { id: record.id } });
        console.error("[auth/forgot-password] email delivery failed");
      }
    }
  } catch {
    console.error("[auth/forgot-password] recovery request failed");
  }
  return {
    success: true,
    message: "Agar bu email ro'yxatdan o'tgan bo'lsa, tiklash havolasi yuboriladi. Email va spam papkasini tekshiring.",
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
  const requestError = await authRequestError("reset-password", token);
  if (requestError) return requestError;
  try {
    const passwordHash = await hashPassword(password);
    if (!await completePasswordReset(token, passwordHash)) {
      return { message: "Havola yaroqsiz yoki muddati o'tgan." };
    }
  } catch {
    console.error("[auth/reset-password] password reset failed");
    return { message: "Parolni yangilashda xatolik. Keyinroq qaytadan urinib ko'ring." };
  }
  await deleteSession();
  redirect("/login?reset=1");
}
