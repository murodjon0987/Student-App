import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from "date-fns";

export function formatCurrency(amount: number, currency = "UZS") {
  try {
    return new Intl.NumberFormat("uz-UZ", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("uz-UZ", {
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDate(value: Date | string, pattern = "d MMM yyyy") {
  return format(new Date(value), pattern);
}

export function formatTime(value: Date | string) {
  return format(new Date(value), "HH:mm");
}

export function formatDateTime(value: Date | string) {
  return format(new Date(value), "d MMM yyyy, HH:mm");
}

export function relativeDay(value: Date | string) {
  const date = new Date(value);
  if (isToday(date)) return "Bugun";
  if (isTomorrow(date)) return "Ertaga";
  if (isYesterday(date)) return "Kecha";
  return format(date, "d MMM");
}

export function timeAgo(value: Date | string) {
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
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
  const date = new Date(value);
  const dayIndex = (date.getDay() + 6) % 7;
  return `${WEEKDAYS_UZ[dayIndex]}, ${date.getDate()}-${
    MONTHS_UZ[date.getMonth()]
  } ${date.getFullYear()}`;
}
