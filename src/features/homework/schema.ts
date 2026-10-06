import { z } from "zod";

export const HOMEWORK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const HOMEWORK_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;

export type HomeworkPriority = (typeof HOMEWORK_PRIORITIES)[number];
export type HomeworkStatus = (typeof HOMEWORK_STATUSES)[number];

export const homeworkSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, { error: "Vazifa nomini kiriting" }).trim(),
  description: z.string().trim().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  priority: z.enum(HOMEWORK_PRIORITIES),
  status: z.enum(HOMEWORK_STATUSES),
  deadline: z.string().optional().nullable(),
});

export type HomeworkInput = z.infer<typeof homeworkSchema>;
