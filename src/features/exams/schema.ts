import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const examSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, { error: "Imtihon nomini kiriting" }).trim(),
  subjectId: z.string().optional().nullable(),
  date: z.string().min(1, { error: "Sanani kiriting" }),
  time: z
    .string()
    .trim()
    .refine((value) => !value || timeRegex.test(value), {
      error: "Vaqt noto'g'ri kiritilgan",
    })
    .optional()
    .nullable(),
  room: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  prepProgress: z.number().min(0).max(100),
});

export type ExamInput = z.infer<typeof examSchema>;
