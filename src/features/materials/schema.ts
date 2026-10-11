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
  title: z
    .string()
    .trim()
    .min(1, { error: "Material nomini kiriting" })
    .max(200, { error: "Nom 200 ta belgidan oshmasligi kerak" }),
  category: z.enum(MATERIAL_CATEGORY_VALUES),
  url: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return /^https?:\/\//i.test(value) && ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
      } catch {
        return false;
      }
    }, {
      error: "To'g'ri http:// yoki https:// havolasini kiriting",
    }),
  description: z.string().trim().optional().nullable(),
  subjectId: z.string().optional().nullable(),
});

export type MaterialInput = z.infer<typeof materialSchema>;
