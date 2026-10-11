import "server-only";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/format";
import { STATUS_LABELS, PRIORITY_LABELS, MATERIAL_CATEGORIES, type TaskStatus, type Priority } from "@/lib/constants";

interface SearchDetail {
  title: string; content: string; section: string;
  fields: { label: string; value: string }[];
  entries?: { title: string; content: string }[];
  url?: string | null;
}
const field = (label: string, value: string | null | undefined) => ({ label, value: value || "Belgilanmagan" });
export async function getSearchDetail(userId: string, kind: string, id: string): Promise<SearchDetail | null> {
  const where = { id, userId };
  switch (kind) {
    case "notes": {
      const item = await prisma.note.findFirst({ where });
      return item ? { title: item.title, content: item.content, section: "/notes", fields: [field("Teglar", item.tags.join(", ")), field("Yangilangan", formatDateTime(item.updatedAt))] } : null;
    }
    case "tasks":
    case "homework": {
      const item = kind === "tasks" ? await prisma.task.findFirst({ where }) : await prisma.homework.findFirst({ where });
      return item ? { title: item.title, content: item.description ?? "", section: `/${kind}`, fields: [field("Holat", STATUS_LABELS[item.status as TaskStatus]), field("Muhimlik", PRIORITY_LABELS[item.priority as Priority]), field("Muddat", item.deadline ? formatDateTime(item.deadline) : null)] } : null;
    }
    case "exams": {
      const item = await prisma.exam.findFirst({ where });
      return item ? { title: item.title, content: item.description ?? "", section: "/exams", fields: [field("Sana", formatDate(item.date)), field("Vaqt", item.time), field("Xona", item.room), field("Tayyorgarlik", `${item.prepProgress}%`)] } : null;
    }
    case "materials": {
      const item = await prisma.material.findFirst({ where });
      return item ? { title: item.title, content: item.description ?? "", section: "/materials", url: item.url, fields: [field("Kategoriya", MATERIAL_CATEGORIES.find((category) => category.value === item.category)?.label)] } : null;
    }
    case "events": {
      const item = await prisma.event.findFirst({ where });
      return item ? { title: item.title, content: item.description ?? "", section: "/calendar", fields: [field("Boshlanish", item.allDay ? formatDate(item.start) : formatDateTime(item.start)), field("Tugash", item.end ? (item.allDay ? formatDate(item.end) : formatDateTime(item.end)) : null)] } : null;
    }
    case "goals": {
      const item = await prisma.goal.findFirst({ where, include: { tasks: { orderBy: [{ order: "asc" }, { id: "asc" }] } } });
      return item ? { title: item.title, content: item.description ?? "", section: "/goals", fields: [field("Muddat", item.targetDate ? formatDate(item.targetDate) : null)], entries: item.tasks.map((task) => ({ title: task.title, content: task.done ? "Bajarildi" : "Kutilmoqda" })) } : null;
    }
    case "subjects": {
      const item = await prisma.subject.findFirst({ where });
      return item ? { title: item.name, content: "", section: "/schedule", fields: [field("O'qituvchi", item.teacher)] } : null;
    }
    case "decks": {
      const item = await prisma.flashcardDeck.findFirst({ where, include: { cards: { orderBy: { id: "asc" } } } });
      return item ? { title: item.title, content: "", section: "/learn", fields: [field("Fan", item.subject), field("Kartochkalar", String(item.cards.length))], entries: item.cards.map((card) => ({ title: card.question, content: card.answer })) } : null;
    }
    case "opportunities": {
      // Opportunities are shared with all signed-in students, as in the list.
      const item = await prisma.opportunity.findUnique({ where: { id } });
      return item ? { title: item.title, content: item.requirements, section: "/opportunities", url: item.url, fields: [field("Tashkilot", item.organization), field("Yo'nalish", item.field), field("Kurs", `${item.minCourse}–${item.maxCourse}`), field("Til", item.language), field("Ariza muddati", formatDate(item.deadline))] } : null;
    }
    default: return null;
  }
}

export function safeExternalUrl(value?: string | null) {
  if (!value) return null;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}
