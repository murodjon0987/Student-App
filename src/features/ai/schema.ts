import { z } from "zod";

export const chatRequestSchema = z.object({
  chatId: z.string().optional().nullable(),
  message: z
    .string()
    .trim()
    .min(1, { error: "Xabar bo'sh bo'lmasligi kerak" })
    .max(4000, { error: "Xabar juda uzun (maksimal 4000 belgi)" }),
  mode: z.enum(["chat", "image"]).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const renameChatSchema = z.object({
  id: z.string().min(1),
  title: z
    .string()
    .min(1, { error: "Suhbat nomini kiriting" })
    .max(80, { error: "Nom juda uzun" })
    .trim(),
});

export type RenameChatInput = z.infer<typeof renameChatSchema>;
