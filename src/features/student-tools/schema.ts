import { z } from "zod";

export const idSchema = z.string().min(1).max(100);
export const opportunityKinds = { SCHOLARSHIP: "Stipendiya", GRANT: "Grant", INTERNSHIP: "Amaliyot" };
export const cardSchema = z.object({
  id: idSchema.optional(),
  question: z.string().trim().min(1, "Savol kiriting").max(1000),
  answer: z.string().trim().min(1, "Javob kiriting").max(2000),
  distractors: z.array(z.string().trim().min(1).max(2000)).max(3).default([]),
}).refine((card) => new Set([card.answer.toLocaleLowerCase(), ...card.distractors.map((s) => s.toLocaleLowerCase())]).size === card.distractors.length + 1, "Javob variantlari takrorlanmasin");
export const deckSchema = z.object({
  id: idSchema.optional(),
  title: z.string().trim().min(1, "To'plam nomini kiriting").max(160),
  subject: z.string().trim().max(100).default(""),
  cards: z.array(cardSchema).min(1).max(100),
});
export const topicSchema = z.object({ name: z.string().trim().min(1).max(160), minutes: z.number().int().min(10).max(1440) });
export const planSchema = z.object({
  examId: idSchema,
  dailyMinutes: z.number().int().min(10).max(480),
  topics: z.array(topicSchema).min(1).max(50).refine((items) => new Set(items.map((t) => t.name.toLocaleLowerCase())).size === items.length, "Mavzu nomlari takrorlanmasin"),
});
export const opportunitySchema = z.object({
  id: idSchema.optional(),
  title: z.string().trim().min(3).max(160),
  organization: z.string().trim().min(2).max(160),
  kind: z.enum(["SCHOLARSHIP", "GRANT", "INTERNSHIP"]),
  field: z.string().trim().min(1).max(100),
  minCourse: z.number().int().min(1).max(6),
  maxCourse: z.number().int().min(1).max(6),
  language: z.string().trim().min(1).max(100),
  requirements: z.string().trim().min(10).max(5000),
  url: z.string().url().max(2000).refine((s) => new URL(s).protocol === "https:", "Manba HTTPS havolasi bo'lsin"),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((o) => o.maxCourse >= o.minCourse, "Kurs oralig'i noto'g'ri");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const importRowSchema = z.object({
  title: z.string().trim().min(1).max(160),
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: time,
  endTime: time,
  teacher: z.string().trim().max(160).default(""),
  room: z.string().trim().max(100).default(""),
}).refine((r) => r.startTime < r.endTime, "Dars tugashi boshlanishidan keyin bo'lsin");
export const importRowsSchema = z.array(importRowSchema).min(1).max(100);
export type CardInput = z.infer<typeof cardSchema>;
export type ImportRow = z.infer<typeof importRowSchema>;
export type PlanTopic = z.infer<typeof topicSchema>;
