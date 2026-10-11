import { z } from "zod";

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const TASK_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const taskSchema = z.object({
  id: z.string().optional(),
  title: z
    .string()
    .trim()
    .min(1, { error: "Vazifa nomini kiriting" })
    .max(200, { error: "Nom 200 ta belgidan oshmasligi kerak" }),
  description: z
    .string()
    .trim()
    .max(2000, { error: "Tavsif 2000 ta belgidan oshmasligi kerak" })
    .optional()
    .nullable(),
  subjectId: z.string().optional().nullable(),
  priority: z.enum(TASK_PRIORITIES),
  status: z.enum(TASK_STATUSES),
  category: z
    .string()
    .trim()
    .max(60, { error: "Kategoriya 60 ta belgidan oshmasligi kerak" })
    .optional()
    .nullable(),
  deadline: z.string().optional().nullable(),
});

export type TaskInput = z.infer<typeof taskSchema>;
