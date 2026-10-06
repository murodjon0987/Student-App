import "server-only";

import { prisma } from "@/lib/prisma";
import {
  formatCurrency,
  formatDate,
  formatUzFullDate,
  weekdayName,
} from "@/lib/format";

const MAX_ITEMS = 15;

function line(label: string, value: string | null | undefined) {
  return value ? `- ${label}: ${value}` : null;
}

function listOrNone(items: string[], empty = "(yo'q)") {
  return items.length ? items.join("\n") : empty;
}

/**
 * Foydalanuvchi ma'lumotlaridan AI uchun qisqa kontekst matni yig'adi.
 * Har bir so'rovda chaqiriladi va faqat kerakli qismlarini yuboradi.
 */
export async function buildStudentContext(userId: string): Promise<string> {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;

  const [
    user,
    subjects,
    schedule,
    tasks,
    homeworks,
    exams,
    notes,
    budget,
    expenses,
    goals,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    }),
    prisma.subject.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.schedule.findMany({
      where: { userId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      include: { subject: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: { userId, status: { not: "COMPLETED" } },
      orderBy: [{ deadline: "asc" }],
      take: MAX_ITEMS,
      include: { subject: { select: { name: true } } },
    }),
    prisma.homework.findMany({
      where: { userId, status: { not: "COMPLETED" } },
      orderBy: [{ deadline: "asc" }],
      take: MAX_ITEMS,
      include: { subject: { select: { name: true } } },
    }),
    prisma.exam.findMany({
      where: { userId, date: { gte: now } },
      orderBy: { date: "asc" },
      take: MAX_ITEMS,
      include: { subject: { select: { name: true } } },
    }),
    prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: MAX_ITEMS,
      select: { title: true, tags: true },
    }),
    prisma.budget.findFirst({ where: { userId, month } }),
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
    }),
    prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: MAX_ITEMS,
      include: { tasks: { select: { title: true, done: true } } },
    }),
  ]);

  const name = user?.name ?? "Student";
  const profile = user?.profile;

  const sections: string[] = [];

  sections.push(
    [
      `Bugungi sana: ${formatUzFullDate(now)} (${now.toLocaleTimeString(
        "uz-UZ",
        { hour: "2-digit", minute: "2-digit" }
      )}, Asia/Tashkent)`,
      `Talaba: ${name}`,
    ]
      .filter(Boolean)
      .join("\n")
  );

  const profileLines = [
    line("Universitet", profile?.university),
    line("Fakultet", profile?.faculty),
    line("Kurs", profile?.course ? String(profile.course) : null),
    line("Guruh", profile?.group),
  ].filter((v): v is string => Boolean(v));
  if (profileLines.length) {
    sections.push(`## Profil\n${profileLines.join("\n")}`);
  }

  sections.push(
    `## Fanlar\n${listOrNone(
      subjects.map((s) => `- ${s.name}${s.teacher ? ` (${s.teacher})` : ""}`)
    )}`
  );

  const scheduleLines = schedule.map(
    (s) =>
      `- ${weekdayName(s.dayOfWeek)} ${s.startTime}-${s.endTime}: ${
        s.title
      }${s.room ? `, ${s.room}-xona` : ""}`
  );
  sections.push(`## Dars jadvali\n${listOrNone(scheduleLines)}`);

  const taskLines = tasks.map(
    (t) =>
      `- [${t.priority}] ${t.title}${
        t.subject ? ` (${t.subject.name})` : ""
      }${t.deadline ? ` — muddat: ${formatDate(t.deadline)}` : ""}`
  );
  sections.push(`## Bajarilmagan vazifalar\n${listOrNone(taskLines)}`);

  const homeworkLines = homeworks.map(
    (h) =>
      `- ${h.title}${h.subject ? ` (${h.subject.name})` : ""}${
        h.deadline ? ` — muddat: ${formatDate(h.deadline)}` : ""
      }`
  );
  sections.push(`## Uy vazifalari\n${listOrNone(homeworkLines)}`);

  const examLines = exams.map(
    (e) =>
      `- ${e.title}${e.subject ? ` (${e.subject.name})` : ""} — ${formatDate(
        e.date
      )}${e.time ? ` ${e.time}` : ""} (tayyorlik: ${e.prepProgress}%)`
  );
  sections.push(`## Yaqin imtihonlar\n${listOrNone(examLines)}`);

  const noteLines = notes.map(
    (n) => `- ${n.title}${n.tags.length ? ` [${n.tags.join(", ")}]` : ""}`
  );
  sections.push(`## Eslatmalar\n${listOrNone(noteLines)}`);

  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const budgetLines = [
    budget ? `- Oylik budjet: ${formatCurrency(budget.amount)}` : null,
    `- Joriy oy xarajati: ${formatCurrency(spent)}`,
  ].filter((v): v is string => Boolean(v));
  sections.push(`## Moliya\n${budgetLines.join("\n")}`);

  const goalLines = goals.map(
    (g) =>
      `- ${g.title} (${g.tasks.filter((t) => t.done).length}/${
        g.tasks.length
      } bajarildi)${g.targetDate ? ` — ${formatDate(g.targetDate)}` : ""}`
  );
  sections.push(`## Maqsadlar\n${listOrNone(goalLines)}`);

  return sections.join("\n\n");
}
