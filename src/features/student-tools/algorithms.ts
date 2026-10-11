import type { ImportRow, PlanTopic } from "./schema";
import { importRowsSchema } from "./schema";

const DAY = 86_400_000;
// Academic dates use the platform's Uzbekistan timezone, independent of server TZ.
export function localDateKey(date = new Date()) {
  return new Date(date.getTime() + 5 * 3_600_000).toISOString().slice(0, 10);
}
export function academicTimestamp(value: string) {
  const local = new Date(new Date(value).getTime() + 5 * 3_600_000).toISOString();
  const [year, month, day] = local.slice(0, 10).split("-");
  return `${day}.${month}.${year} ${local.slice(11, 16)}`;
}
export function academicDate(value: string) {
  const result = new Date(`${value}T00:00:00+05:00`);
  if (!Number.isFinite(result.getTime()) || localDateKey(result) !== value) throw new Error("Sana noto'g'ri");
  return result;
}
export function nextReview(repetitions: number, intervalDays: number, known: boolean, now = new Date()) {
  const interval = known ? repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.min(180, Math.max(1, intervalDays) * 2) : 0;
  return { intervalDays: interval, repetitions: known ? repetitions + 1 : 0, dueAt: new Date(now.getTime() + (known ? interval * DAY : 10 * 60_000)) };
}
export function allocatePlan(topics: PlanTopic[], dailyMinutes: number, examDate: Date, completed: { topic: string; minutes: number; date?: Date }[] = [], now = new Date()) {
  const start = academicDate(localDateKey(now));
  const days = Math.max(0, Math.min(366, Math.ceil((academicDate(localDateKey(examDate)).getTime() - start.getTime()) / DAY)));
  const remaining = topics.map((t) => ({ ...t, minutes: Math.max(0, t.minutes - completed.filter((c) => c.topic === t.name).reduce((sum, c) => sum + c.minutes, 0)) }));
  const tasks: { topic: string; minutes: number; date: Date }[] = [];
  let index = 0;
  for (let day = 0; day < days && index < remaining.length; day++) {
    const date = new Date(start.getTime() + day * DAY);
    const used = completed.filter((c) => c.date && localDateKey(c.date) === localDateKey(date)).reduce((sum, c) => sum + c.minutes, 0);
    let budget = Math.max(0, dailyMinutes - used);
    while (budget > 0 && index < remaining.length) {
      const topic = remaining[index];
      if (!topic.minutes) { index++; continue; }
      const minutes = Math.min(budget, topic.minutes);
      tasks.push({ topic: topic.name, minutes, date });
      budget -= minutes;
      topic.minutes -= minutes;
      if (!topic.minutes) index++;
    }
  }
  return { tasks, unscheduledMinutes: remaining.reduce((sum, t) => sum + t.minutes, 0), days };
}

// CSV supports quoted commas/newlines and escaped quotes. Never execute formulas.
export function parseScheduleCsv(text: string): ImportRow[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  const input = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  for (let i = 0; i <= input.length; i++) {
    const ch = input[i] ?? "\n";
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (ch === "," || ch === "\n")) {
      row.push(cell.trim()); cell = "";
      if (ch === "\n") { if (row.some(Boolean)) rows.push(row); row = []; }
    } else cell += ch;
  }
  if (quoted) throw new Error("CSV qo'shtirnoqlari yopilmagan");
  const header = rows.shift()?.map((s) => s.toLowerCase()) ?? [];
  const required = ["title", "dayofweek", "starttime", "endtime"];
  if (!required.every((key) => header.includes(key))) throw new Error("CSV ustunlari: title,dayOfWeek,startTime,endTime,teacher,room");
  const get = (r: string[], key: string) => r[header.indexOf(key)] ?? "";
  return importRowsSchema.parse(rows.map((r) => ({ title: get(r, "title"), dayOfWeek: Number(get(r, "dayofweek")), startTime: get(r, "starttime"), endTime: get(r, "endtime"), teacher: get(r, "teacher"), room: get(r, "room") })));
}
export function scheduleKey(row: Pick<ImportRow, "title" | "dayOfWeek" | "startTime" | "endTime">) {
  return `${row.title.trim().toLowerCase()}|${row.dayOfWeek}|${row.startTime}|${row.endTime}`;
}
export function overlaps(a: Pick<ImportRow, "dayOfWeek" | "startTime" | "endTime">, b: Pick<ImportRow, "dayOfWeek" | "startTime" | "endTime">) {
  return a.dayOfWeek === b.dayOfWeek && a.startTime < b.endTime && b.startTime < a.endTime;
}
