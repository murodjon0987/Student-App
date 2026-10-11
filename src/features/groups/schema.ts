import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().trim().min(2, "Guruh nomini kiriting").max(80),
  university: z.string().trim().min(2, "Universitet nomini kiriting").max(160),
});
export const joinGroupSchema = z.string().trim().toUpperCase().regex(/^[A-F0-9]{16}$/, "Taklif kodi 16 ta belgidan iborat");
export const groupPostSchema = z.object({
  groupId: z.string().min(1).max(100),
  kind: z.enum(["ANNOUNCEMENT", "MATERIAL", "QUESTION"]),
  title: z.string().trim().min(2, "Sarlavha kiriting").max(160),
  content: z.string().trim().min(1, "Matn kiriting").max(5000),
  subject: z.string().trim().max(100).default(""),
  topic: z.string().trim().max(100).default(""),
  url: z.union([z.literal(""), z.string().trim().url().max(2000).refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "Faqat http yoki https havola kiriting")]).default(""),
});
