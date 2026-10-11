import "server-only";

import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { literalSearch } from "@/lib/list-query";
import { pageNumber, type ListParams } from "@/lib/pagination";

export const SEARCH_PAGE_SIZE = 8;
export interface SearchPageInfo { page: number; hasMore: boolean }
export type SearchPages = Record<keyof SearchGroups, SearchPageInfo>;

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
  transit: SearchResultItem[];
  decks: SearchResultItem[];
  plans: SearchResultItem[];
  questions: SearchResultItem[];
  opportunities: SearchResultItem[];
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
  transit: [],
  decks: [],
  plans: [],
  questions: [],
  opportunities: [],
};

function snippet(value: string | null | undefined) {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export async function globalSearch(
  userId: string,
  q: string,
  params: ListParams = {},
): Promise<{ groups: SearchGroups; pages: SearchPages }> {
  const term = q.trim().slice(0, 200);
  const keys = Object.keys(EMPTY_GROUPS) as (keyof SearchGroups)[];
  const pages = Object.fromEntries(keys.map((key) => [key, { page: Math.min(pageNumber(params[key + "Page"]), 100_000), hasMore: false }])) as SearchPages;
  if (term.length < 2) return { groups: EMPTY_GROUPS, pages };
  const range = (key: keyof SearchGroups) => ({ skip: (pages[key].page - 1) * SEARCH_PAGE_SIZE, take: SEARCH_PAGE_SIZE + 1 });
  function visible<T>(key: keyof SearchGroups, items: T[]): T[] {
    pages[key].hasMore = items.length > SEARCH_PAGE_SIZE;
    return items.slice(0, SEARCH_PAGE_SIZE);
  }

  const contains = { contains: literalSearch(term), mode: "insensitive" as const };

  const [notes, tasks, homework, exams, materials, events, goals, subjects, transit, decks, plans, questions, opportunities] =
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
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        ...range("notes"),
      }),
      prisma.task.findMany({
        where: {
          userId,
          OR: [{ title: contains }, { description: contains }],
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...range("tasks"),
      }),
      prisma.homework.findMany({
        where: {
          userId,
          OR: [{ title: contains }, { description: contains }],
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...range("homework"),
      }),
      prisma.exam.findMany({
        where: { userId, title: contains },
        orderBy: [{ date: "asc" }, { id: "asc" }],
        ...range("exams"),
      }),
      prisma.material.findMany({
        where: {
          userId,
          OR: [{ title: contains }, { description: contains }],
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...range("materials"),
      }),
      prisma.event.findMany({
        where: { userId, title: contains },
        orderBy: [{ start: "desc" }, { id: "desc" }],
        ...range("events"),
      }),
      prisma.goal.findMany({
        where: { userId, title: contains },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...range("goals"),
      }),
      prisma.subject.findMany({
        where: { userId, name: contains },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        ...range("subjects"),
      }),
      prisma.transitStop.findMany({
        where: { name: contains },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        ...range("transit"),
      }),
      prisma.flashcardDeck.findMany({ where: { userId, OR: [{ title: contains }, { subject: contains }] }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], ...range("decks"), select: { id: true, title: true, subject: true } }),
      prisma.studyPlan.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], where: { userId, exam: { title: contains } }, ...range("plans"), include: { exam: { select: { title: true, date: true } } } }),
      prisma.groupPost.findMany({ where: { kind: "QUESTION", group: { members: { some: { userId } } }, OR: [{ title: contains }, { subject: contains }, { topic: contains }] }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], ...range("questions"), select: { id: true, title: true, subject: true, topic: true } }),
      prisma.opportunity.findMany({ where: { deadline: { gte: new Date() }, OR: [{ title: contains }, { organization: contains }, { field: contains }] }, orderBy: [{ deadline: "asc" }, { id: "asc" }], ...range("opportunities"), select: { id: true, title: true, organization: true } }),
    ]);

  const groups: SearchGroups = {
    decks: visible("decks", decks).map((d) => ({ id: d.id, title: d.title, subtitle: d.subject, href: `/search/decks/${d.id}` })),
    plans: visible("plans", plans).map((p) => ({ id: p.id, title: p.exam.title, subtitle: formatDate(p.exam.date), href: `/study-plans?exam=${p.examId}` })),
    questions: visible("questions", questions).map((q) => ({ id: q.id, title: q.title, subtitle: [q.subject, q.topic].filter(Boolean).join(" · "), href: `/groups/questions/${q.id}` })),
    opportunities: visible("opportunities", opportunities).map((o) => ({ id: o.id, title: o.title, subtitle: o.organization, href: `/search/opportunities/${o.id}` })),
    notes: visible("notes", notes).map((note) => ({
      id: note.id,
      title: note.title,
      subtitle: snippet(note.content) || note.tags.join(", "),
      href: `/search/notes/${note.id}`,
    })),
    tasks: visible("tasks", tasks).map((task) => ({
      id: task.id,
      title: task.title,
      subtitle: snippet(task.description),
      href: `/search/tasks/${task.id}`,
    })),
    homework: visible("homework", homework).map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: snippet(item.description),
      href: `/search/homework/${item.id}`,
    })),
    exams: visible("exams", exams).map((exam) => ({
      id: exam.id,
      title: exam.title,
      subtitle: `${formatDate(exam.date)}${exam.time ? ` · ${exam.time}` : ""}`,
      href: `/search/exams/${exam.id}`,
    })),
    materials: visible("materials", materials).map((material) => ({
      id: material.id,
      title: material.title,
      subtitle: snippet(material.description),
      href: `/search/materials/${material.id}`,
    })),
    events: visible("events", events).map((event) => ({
      id: event.id,
      title: event.title,
      subtitle: formatDate(event.start),
      href: `/search/events/${event.id}`,
    })),
    goals: visible("goals", goals).map((goal) => ({
      id: goal.id,
      title: goal.title,
      subtitle: goal.targetDate ? formatDate(goal.targetDate) : snippet(goal.description),
      href: `/search/goals/${goal.id}`,
    })),
    subjects: visible("subjects", subjects).map((subject) => ({
      id: subject.id,
      title: subject.name,
      subtitle: subject.teacher ?? "",
      href: `/search/subjects/${subject.id}`,
    })),
    transit: visible("transit", transit).map((stop) => ({
      id: stop.id,
      title: stop.name,
      subtitle: stop.mode === "METRO" ? "Metro bekati" : "Avtobus bekati",
      href: `/transport/stop/${stop.id}`,
    })),
  };
  return { groups, pages };
}
