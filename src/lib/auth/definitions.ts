import { z } from "zod";

export const SignupSchema = z.object({
  name: z
    .string()
    .min(2, { error: "Ism kamida 2 ta harfdan iborat bo'lishi kerak" })
    .trim(),
  email: z.email({ error: "To'g'ri email kiriting" }).trim().toLowerCase(),
  password: z
    .string()
    .min(8, { error: "Parol kamida 8 ta belgidan iborat bo'lishi kerak" })
    .regex(/[a-zA-Z]/, { error: "Kamida bitta harf bo'lishi kerak" })
    .regex(/[0-9]/, { error: "Kamida bitta raqam bo'lishi kerak" }),
});

export const LoginSchema = z.object({
  email: z.email({ error: "To'g'ri email kiriting" }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Parolni kiriting" }),
});

export const ForgotPasswordSchema = z.object({
  email: z.email({ error: "To'g'ri email kiriting" }).trim().toLowerCase(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, { error: "Parol kamida 8 ta belgidan iborat bo'lishi kerak" })
    .regex(/[a-zA-Z]/, { error: "Kamida bitta harf bo'lishi kerak" })
    .regex(/[0-9]/, { error: "Kamida bitta raqam bo'lishi kerak" }),
});

export type AuthFormState =
  | {
      errors?: Record<string, string[] | undefined>;
      message?: string;
      success?: boolean;
    }
  | undefined;
