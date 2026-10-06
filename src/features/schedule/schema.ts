import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const scheduleSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().min(1, { error: "Dars nomini kiriting" }).trim(),
    subjectId: z.string().optional().nullable(),
    teacher: z.string().trim().optional().nullable(),
    room: z.string().trim().optional().nullable(),
    dayOfWeek: z
      .number()
      .int()
      .min(1, { error: "Hafta kunini tanlang" })
      .max(7),
    startTime: z.string().regex(timeRegex, { error: "Boshlanish vaqti noto'g'ri" }),
    endTime: z.string().regex(timeRegex, { error: "Tugash vaqti noto'g'ri" }),
    color: z.string(),
  })
  .refine((data) => data.startTime < data.endTime, {
    error: "Tugash vaqti boshlanishidan keyin bo'lishi kerak",
    path: ["endTime"],
  });

export type ScheduleInput = z.infer<typeof scheduleSchema>;
