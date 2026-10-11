// All academic dates use Uzbekistan time (UTC+05:00), on both server and client.
export const APP_TIME_ZONE = "Asia/Tashkent";
export const DAY_MS = 86_400_000;
const OFFSET = 5 * 3_600_000;

export function localDateKey(value: Date | string = new Date()) {
  return new Date(new Date(value).getTime() + OFFSET).toISOString().slice(0, 10);
}

export function academicDate(value: string) {
  const date = new Date(`${value}T00:00:00+05:00`);
  if (!Number.isFinite(date.getTime()) || localDateKey(date) !== value) throw new Error("Sana noto'g'ri");
  return date;
}

export function appDateParts(value: Date | string = new Date()) {
  const date = new Date(new Date(value).getTime() + OFFSET);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate(), weekday: date.getUTCDay(), hour: date.getUTCHours(), minute: date.getUTCMinutes() };
}

export function monthKey(value: Date | string = new Date()) {
  return localDateKey(value).slice(0, 7);
}

export function monthRange(month = monthKey()) {
  const [year, number] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 10);
  return { start: academicDate(`${month}-01`), end: new Date(academicDate(next).getTime() - 1) };
}

export function dayRange(value = new Date()) {
  const start = academicDate(localDateKey(value));
  return { start, end: new Date(start.getTime() + DAY_MS - 1) };
}

export function weekRange(value = new Date()) {
  const start = new Date(dayRange(value).start.getTime() - ((appDateParts(value).weekday + 6) % 7) * DAY_MS);
  return { start, end: new Date(start.getTime() + 7 * DAY_MS - 1) };
}

export function shiftMonth(month: string, delta: number) {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function parseAcademicDateTime(value: string) {
  // datetime-local inputs have no offset; explicitly interpret them in Tashkent.
  return new Date(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$/.test(value)
    ? `${value.includes("T") ? value : `${value}T00:00:00`}+05:00` : value);
}

// date-fns preserves Date subclasses. UTC getters prevent host TZ/DST from
// changing the already shifted calendar fields during formatting.
export class DisplayDate extends Date {
  getFullYear() { return this.getUTCFullYear(); }
  getMonth() { return this.getUTCMonth(); }
  getDate() { return this.getUTCDate(); }
  getDay() { return this.getUTCDay(); }
  getHours() { return this.getUTCHours(); }
  getMinutes() { return this.getUTCMinutes(); }
  getSeconds() { return this.getUTCSeconds(); }
  getMilliseconds() { return this.getUTCMilliseconds(); }
  getTimezoneOffset() { return 0; }
}

export function displayDate(value: Date | string) {
  return new DisplayDate(new Date(value).getTime() + OFFSET);
}
