import { z } from "zod";

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const TASK_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const taskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, { error: "Vazifa nomini kiriting" }).trim(),
  description: z.string().trim().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  priority: z.enum(TASK_PRIORITIES),
  status: z.enum(TASK_STATUSES),
  category: z.string().trim().optional().nullable(),
  deadline: z.string().optional().nullable(),
});

export type TaskInput = z.infer<typeof taskSchema>;
