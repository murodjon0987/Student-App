import { z } from "zod";
import { POMODORO_MODES } from "@/lib/constants";

export const studySessionSchema = z.object({
  subjectId: z.string().optional().nullable(),
  durationMin: z
    .number()
    .int()
    .max(180, { error: "Eng ko'p 180 daqiqa" })
    .positive({ error: "Davomiylik 0 dan katta bo'lishi kerak" }),
  mode: z.string().refine((id) => id === "CUSTOM" || POMODORO_MODES.some((mode) => mode.id === id), { error: "Rejimni tanlang" }),
  sessionId: z.string().uuid().optional(),
  endedAt: z.string().datetime().optional(),
});

export type StudySessionInput = z.infer<typeof studySessionSchema>;
