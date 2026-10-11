import { z } from "zod";

export const noteSchema = z.object({
  id: z.string().optional(),
  title: z
    .string()
    .trim()
    .min(1, { error: "Eslatma nomini kiriting" })
    .max(200, { error: "Nom 200 ta belgidan oshmasligi kerak" }),
  content: z
    .string()
    .max(50_000, { error: "Matn 50000 ta belgidan oshmasligi kerak" }),
  subjectId: z.string().optional().nullable(),
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(20, { error: "Ko'pi bilan 20 ta teg qo'shish mumkin" }),
});

export type NoteInput = z.infer<typeof noteSchema>;
