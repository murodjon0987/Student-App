import { z } from "zod";

export const GRADE_OPTIONS = [
  "5.0",
  "4.5",
  "4.0",
  "3.5",
  "3.0",
  "2.0",
] as const;

export const gradeSchema = z.object({
  id: z.string().optional(),
  subjectName: z.string().min(1, { error: "Fan nomini kiriting" }).trim(),
  credit: z
    .number({ error: "Kreditni kiriting" })
    .positive({ error: "Kredit 0 dan katta bo'lishi kerak" }),
  grade: z.string().min(1, { error: "Bahoni tanlang" }),
});

export type GradeInput = z.infer<typeof gradeSchema>;
