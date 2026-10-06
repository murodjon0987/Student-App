import { z } from "zod";

export const CALENDAR_EVENT_TYPES = [
  "CLASS",
  "HOMEWORK",
  "EXAM",
  "DEADLINE",
  "GOAL",
  "PERSONAL",
] as const;

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export const eventSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, { error: "Tadbir nomini kiriting" }).trim(),
  description: z.string().trim().optional().nullable(),
  type: z.enum(CALENDAR_EVENT_TYPES),
  start: z.string().min(1, { error: "Boshlanish vaqtini kiriting" }),
  end: z.string().optional().nullable(),
  allDay: z.boolean(),
  color: z.string(),
});

export type EventInput = z.infer<typeof eventSchema>;
