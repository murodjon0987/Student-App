import "server-only";

import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchGroups {
  notes: SearchResultItem[];
  tasks: SearchResultItem[];
  homework: SearchResultItem[];
  exams: SearchResultItem[];
  materials: SearchResultItem[];
  events: SearchResultItem[];
  goals: SearchResultItem[];
  subjects: SearchResultItem[];
}

const EMPTY_GROUPS: SearchGroups = {
  notes: [],
  tasks: [],
  homework: [],
  exams: [],
  materials: [],
  events: [],
  goals: [],
  subjects: [],
};

function snippet(value: string | null | undefined) {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export async function globalSearch(
  userId: string,
  q: string
): Promise<SearchGroups> {
  const term = q.trim();
  if (term.length < 2) return EMPTY_GROUPS;

  const contains = { contains: term, mode: "insensitive" as const };

  const [notes, tasks, homework, exams, materials, events, goals, subjects] =
    await Promise.all([
      prisma.note.findMany({
        where: {
          userId,
          OR: [
            { title: contains },
            { content: contains },
            { tags: { hasSome: [term] } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.task.findMany({
        where: {
          userId,
          OR: [{ title: contains }, { description: contains }],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.homework.findMany({
        where: {
          userId,
          OR: [{ title: contains }, { description: contains }],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.exam.findMany({
        where: { userId, title: contains },
        orderBy: { date: "asc" },
        take: 8,
      }),
      prisma.material.findMany({
        where: {
          userId,
          OR: [{ title: contains }, { description: contains }],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.event.findMany({
        where: { userId, title: contains },
        orderBy: { start: "desc" },
        take: 8,
      }),
      prisma.goal.findMany({
        where: { userId, title: contains },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.subject.findMany({
        where: { userId, name: contains },
        orderBy: { name: "asc" },
        take: 8,
      }),
    ]);

  return {
    notes: notes.map((note) => ({
      id: note.id,
      title: note.title,
      subtitle: snippet(note.content) || note.tags.join(", "),
      href: "/notes",
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      subtitle: snippet(task.description),
      href: "/tasks",
    })),
    homework: homework.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: snippet(item.description),
      href: "/homework",
    })),
    exams: exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      subtitle: `${formatDate(exam.date)}${exam.time ? ` · ${exam.time}` : ""}`,
      href: "/exams",
    })),
    materials: materials.map((material) => ({
      id: material.id,
      title: material.title,
      subtitle: snippet(material.description),
      href: "/materials",
    })),
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      subtitle: formatDate(event.start),
      href: "/calendar",
    })),
    goals: goals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      subtitle: goal.targetDate ? formatDate(goal.targetDate) : snippet(goal.description),
      href: "/goals",
    })),
    subjects: subjects.map((subject) => ({
      id: subject.id,
      title: subject.name,
      subtitle: subject.teacher ?? "",
      href: "/schedule",
    })),
  };
}
