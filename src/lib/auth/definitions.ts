import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email({ error: "To'g'ri email kiriting" }));

export const SignupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Ism kamida 2 ta harfdan iborat bo'lishi kerak" })
    .max(100),
  email: emailSchema,
  password: z
    .string()
    .refine((value) => new TextEncoder().encode(value).length <= 72, { error: "Parol UTF-8 bo'yicha 72 baytdan oshmasin" })
    .min(8, { error: "Parol kamida 8 ta belgidan iborat bo'lishi kerak" })
    .regex(/[a-zA-Z]/, { error: "Kamida bitta harf bo'lishi kerak" })
    .regex(/[0-9]/, { error: "Kamida bitta raqam bo'lishi kerak" }),
});

export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Parolni kiriting" }).refine((value) => new TextEncoder().encode(value).length <= 72, { error: "Parol juda uzun" }),
});

export const ForgotPasswordSchema = z.object({
  email: emailSchema,
});

export const ResetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, { error: "Tiklash havolasi yaroqsiz" }),
  password: z
    .string()
    .refine((value) => new TextEncoder().encode(value).length <= 72, { error: "Parol UTF-8 bo'yicha 72 baytdan oshmasin" })
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
