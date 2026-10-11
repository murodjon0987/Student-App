import { z } from "zod";

export const ATTENDANCE_STATUS_VALUES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
] as const;

export type AttendanceStatusValue = (typeof ATTENDANCE_STATUS_VALUES)[number];

export const attendanceSchema = z.object({
  id: z.string().optional(),
  subjectId: z.string().optional().nullable(),
  scheduleId: z.string().optional().nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Sanani kiriting" }),
  status: z.enum(ATTENDANCE_STATUS_VALUES, { error: "Holatni tanlang" }),
  note: z
    .string()
    .trim()
    .max(500, { error: "Izoh 500 ta belgidan oshmasligi kerak" })
    .optional()
    .nullable(),
});

export type AttendanceInput = z.infer<typeof attendanceSchema>;
