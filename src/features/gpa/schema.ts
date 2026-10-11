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
  subjectName: z
    .string()
    .trim()
    .min(1, { error: "Fan nomini kiriting" })
    .max(200, { error: "Fan nomi 200 ta belgidan oshmasligi kerak" }),
  credit: z
    .number({ error: "Kreditni kiriting" })
    .positive({ error: "Kredit 0 dan katta bo'lishi kerak" })
    .max(60, { error: "Kredit 60 dan oshmasligi kerak" }),
  grade: z.enum(GRADE_OPTIONS, { error: "To'g'ri bahoni tanlang" }),
  semesterId: z.string().optional().nullable(),
});

export type GradeInput = z.infer<typeof gradeSchema>;

export const semesterSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .trim()
    .min(1, { error: "Semestr nomini kiriting" })
    .max(60, { error: "Nom 60 ta belgidan oshmasligi kerak" }),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

export type SemesterInput = z.infer<typeof semesterSchema>;
