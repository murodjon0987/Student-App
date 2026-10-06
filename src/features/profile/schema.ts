import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(1, { error: "Ismni kiriting" }).trim(),
  avatarUrl: z.string().trim().optional().nullable(),
  university: z.string().trim().optional().nullable(),
  faculty: z.string().trim().optional().nullable(),
  course: z.number().int().optional().nullable(),
  group: z.string().trim().optional().nullable(),
  bio: z.string().trim().optional().nullable(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
