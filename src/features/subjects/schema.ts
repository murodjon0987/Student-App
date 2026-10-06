import { z } from "zod";

export const subjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { error: "Fan nomini kiriting" }).trim(),
  teacher: z.string().trim().optional().nullable(),
  color: z.string().default("#6366f1"),
});

export type SubjectInput = z.infer<typeof subjectSchema>;
