import { z } from "zod";

export const noteSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, { error: "Eslatma nomini kiriting" }).trim(),
  content: z.string(),
  subjectId: z.string().optional().nullable(),
  tags: z.array(z.string()),
});

export type NoteInput = z.infer<typeof noteSchema>;
