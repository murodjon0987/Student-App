import { z } from "zod";

export const MATERIAL_CATEGORY_VALUES = [
  "PROGRAMMING",
  "MATHEMATICS",
  "PHYSICS",
  "ENGLISH",
  "OTHER",
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORY_VALUES)[number];

export const materialSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, { error: "Material nomini kiriting" }).trim(),
  category: z.enum(MATERIAL_CATEGORY_VALUES),
  url: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((value) => !value || value.startsWith("http"), {
      error: "Havola http yoki https bilan boshlanishi kerak",
    }),
  description: z.string().trim().optional().nullable(),
  subjectId: z.string().optional().nullable(),
});

export type MaterialInput = z.infer<typeof materialSchema>;
