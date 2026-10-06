import { z } from "zod";

export const goalSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, { error: "Maqsad nomini kiriting" }).trim(),
  description: z.string().trim().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  color: z.string(),
});

export const goalTaskSchema = z.object({
  goalId: z.string().min(1, { error: "Maqsad topilmadi" }),
  title: z.string().min(1, { error: "Vazifa nomini kiriting" }).trim(),
});

export type GoalInput = z.infer<typeof goalSchema>;
export type GoalTaskInput = z.infer<typeof goalTaskSchema>;
