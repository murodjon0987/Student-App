import { format, formatDistanceToNowStrict } from "date-fns";
import { uz } from "date-fns/locale";
import { appDateParts, DAY_MS, displayDate, localDateKey } from "./date";

function groupDigits(value: string) {
  const negative = value.startsWith("-");
  const raw = negative ? value.slice(1) : value;
  const [intPart, fracPart] = raw.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const result = fracPart ? `${grouped}.${fracPart}` : grouped;
  return negative ? `-${result}` : result;
}

export function formatNumber(value: number, digits = 0) {
  if (!Number.isFinite(value)) return "0";
  return groupDigits(value.toFixed(digits));
}

export function formatCurrency(amount: number, currency = "UZS") {
  return `${currency} ${formatNumber(amount, 0)}`;
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** index;
  return `${index === 0 || value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}

export function formatDate(value: Date | string, pattern = "d MMM yyyy") {
  return format(displayDate(value), pattern, { locale: uz });
}

export function formatTime(value: Date | string) {
  return formatDate(value, "HH:mm");
}

export function formatDateTime(value: Date | string) {
  return formatDate(value, "d MMM yyyy, HH:mm");
}

export function relativeDay(value: Date | string) {
  const key = localDateKey(value);
  const now = Date.now();
  if (key === localDateKey(new Date(now))) return "Bugun";
  if (key === localDateKey(new Date(now + DAY_MS))) return "Ertaga";
  if (key === localDateKey(new Date(now - DAY_MS))) return "Kecha";
  return formatDate(value, "d MMM");
}

export function timeAgo(value: Date | string) {
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true, locale: uz });
}

export function minutesToHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} daq`;
  if (m === 0) return `${h} soat`;
  return `${h} soat ${m} daq`;
}

export const WEEKDAYS_UZ = [
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
  "Yakshanba",
];

export const MONTHS_UZ = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

export function weekdayName(dayOfWeek: number) {
  return WEEKDAYS_UZ[(dayOfWeek + 6) % 7] ?? "";
}

export function formatUzFullDate(value: Date | string) {
  const date = appDateParts(value);
  const dayIndex = (date.weekday + 6) % 7;
  return `${WEEKDAYS_UZ[dayIndex]}, ${date.day}-${MONTHS_UZ[date.month]} ${date.year}`;
}
