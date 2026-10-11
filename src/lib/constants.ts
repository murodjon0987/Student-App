export type Priority = "LOW" | "MEDIUM" | "HIGH";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Past",
  MEDIUM: "O'rta",
  HIGH: "Yuqori",
};

export const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  HIGH: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Kutilmoqda",
  IN_PROGRESS: "Jarayonda",
  COMPLETED: "Bajarildi",
};

export const STATUS_STYLES: Record<TaskStatus, string> = {
  PENDING: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20",
  IN_PROGRESS: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

export type ExpenseCategory =
  | "FOOD"
  | "TRANSPORT"
  | "STUDY"
  | "INTERNET"
  | "SHOPPING"
  | "ENTERTAINMENT"
  | "OTHER";

export const EXPENSE_CATEGORIES: {
  value: ExpenseCategory;
  label: string;
  color: string;
}[] = [
  { value: "FOOD", label: "Ovqat", color: "#f97316" },
  { value: "TRANSPORT", label: "Transport", color: "#0ea5e9" },
  { value: "STUDY", label: "O'qish", color: "#8b5cf6" },
  { value: "INTERNET", label: "Internet", color: "#06b6d4" },
  { value: "SHOPPING", label: "Xarid", color: "#ec4899" },
  { value: "ENTERTAINMENT", label: "Ko'ngilochar", color: "#eab308" },
  { value: "OTHER", label: "Boshqa", color: "#64748b" },
];

export function expenseCategoryLabel(value: string) {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function expenseCategoryColor(value: string) {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.color ?? "#64748b";
}

export type MaterialCategory =
  | "PROGRAMMING"
  | "MATHEMATICS"
  | "PHYSICS"
  | "ENGLISH"
  | "OTHER";

export const MATERIAL_CATEGORIES: { value: MaterialCategory; label: string }[] = [
  { value: "PROGRAMMING", label: "Programming" },
  { value: "MATHEMATICS", label: "Mathematics" },
  { value: "PHYSICS", label: "Physics" },
  { value: "ENGLISH", label: "English" },
  { value: "OTHER", label: "Boshqa" },
];

export type EventType =
  | "CLASS"
  | "HOMEWORK"
  | "EXAM"
  | "DEADLINE"
  | "GOAL"
  | "PERSONAL";

export const EVENT_TYPES: { value: EventType; label: string; color: string }[] = [
  { value: "CLASS", label: "Dars", color: "#6366f1" },
  { value: "HOMEWORK", label: "Vazifa", color: "#f59e0b" },
  { value: "EXAM", label: "Imtihon", color: "#ef4444" },
  { value: "DEADLINE", label: "Deadline", color: "#ec4899" },
  { value: "GOAL", label: "Maqsad", color: "#10b981" },
  { value: "PERSONAL", label: "Shaxsiy", color: "#0ea5e9" },
];

export const SUBJECT_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
];

export const POMODORO_MODES = [
  { id: "POMODORO_25", label: "25 / 5", work: 25, break: 5 },
  { id: "POMODORO_50", label: "50 / 10", work: 50, break: 10 },
  { id: "POMODORO_90", label: "90 / 15", work: 90, break: 15 },
] as const;

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
];

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Bor",
  ABSENT: "Kelmadi",
  LATE: "Kechikdi",
  EXCUSED: "Sababli",
};

export const ATTENDANCE_BADGE: Record<
  AttendanceStatus,
  "success" | "destructive" | "warning" | "secondary"
> = {
  PRESENT: "success",
  ABSENT: "destructive",
  LATE: "warning",
  EXCUSED: "secondary",
};
