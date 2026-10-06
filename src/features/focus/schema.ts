import { z } from "zod";

export const studySessionSchema = z.object({
  subjectId: z.string().optional().nullable(),
  durationMin: z
    .number()
    .int()
    .positive({ error: "Davomiylik 0 dan katta bo'lishi kerak" }),
  mode: z.string().min(1, { error: "Rejimni tanlang" }),
});

export type StudySessionInput = z.infer<typeof studySessionSchema>;
