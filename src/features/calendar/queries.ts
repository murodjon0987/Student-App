import "server-only";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { EVENT_TYPES } from "@/lib/constants";
import { formatTime } from "@/lib/format";
import { monthKey, monthRange, academicDate, appDateParts } from "@/lib/date";

const MONTH_REGEX = /^(?:19\d{2}|[2-9]\d{3})-(?:0[1-9]|1[0-2])$/;

export interface CalendarItem {
  id: string;
  title: string;
  date: string;
  type: string;
  color: string;
  href?: string;
  time?: string;
}

export interface CalendarData {
  month: string;
  items: CalendarItem[];
}

function currentMonthKey(date = new Date()) {
  return monthKey(date);
}

function typeColor(type: string) {
  return EVENT_TYPES.find((item) => item.value === type)?.color ?? "#6366f1";
}

export async function getCalendarData(month?: string): Promise<CalendarData> {
  const { userId } = await verifySession();

  const target = month && MONTH_REGEX.test(month) ? month : currentMonthKey();
  const [year, monthIndex] = target.split("-").map(Number);
  const { start, end } = monthRange(target);

  const [events, schedules, exams, homeworks, tasks, goals] = await Promise.all([
    prisma.event.findMany({
      where: { userId, start: { gte: start, lte: end } },
      orderBy: { start: "asc" },
    }),
    prisma.schedule.findMany({
      where: { userId },
      orderBy: { startTime: "asc" },
    }),
    prisma.exam.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
    }),
    prisma.homework.findMany({
      where: {
        userId,
        status: { not: "COMPLETED" },
        deadline: { gte: start, lte: end },
      },
      orderBy: { deadline: "asc" },
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: { not: "COMPLETED" },
        deadline: { gte: start, lte: end },
      },
      orderBy: { deadline: "asc" },
    }),
    prisma.goal.findMany({
      where: { userId, targetDate: { gte: start, lte: end } },
      orderBy: { targetDate: "asc" },
    }),
  ]);

  const items: CalendarItem[] = [];

  for (const event of events) {
    items.push({
      id: `event-${event.id}`,
      title: event.title,
      date: event.start.toISOString(),
      type: event.type,
      color: event.color || typeColor(event.type),
      href: "/calendar",
      time: event.allDay ? undefined : formatTime(event.start),
    });
  }

  const daysInMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  for (const schedule of schedules) {
    for (let day = 1; day <= daysInMonth; day++) {
      const date = academicDate(`${target}-${String(day).padStart(2, "0")}`);
      const weekday = appDateParts(date).weekday || 7;
      if (weekday !== schedule.dayOfWeek) continue;

      items.push({
        id: `schedule-${schedule.id}-${day}`,
        title: schedule.title,
        date: date.toISOString(),
        type: "CLASS",
        color: schedule.color || typeColor("CLASS"),
        href: "/schedule",
        time: schedule.startTime,
      });
    }
  }

  for (const exam of exams) {
    items.push({
      id: `exam-${exam.id}`,
      title: exam.title,
      date: exam.date.toISOString(),
      type: "EXAM",
      color: typeColor("EXAM"),
      href: "/exams",
      time: exam.time ?? undefined,
    });
  }

  for (const homework of homeworks) {
    if (!homework.deadline) continue;
    items.push({
      id: `homework-${homework.id}`,
      title: homework.title,
      date: homework.deadline.toISOString(),
      type: "HOMEWORK",
      color: typeColor("HOMEWORK"),
      href: "/homework",
      time: formatTime(homework.deadline),
    });
  }

  for (const task of tasks) {
    if (!task.deadline) continue;
    items.push({
      id: `task-${task.id}`,
      title: task.title,
      date: task.deadline.toISOString(),
      type: "DEADLINE",
      color: typeColor("DEADLINE"),
      href: "/tasks",
      time: formatTime(task.deadline),
    });
  }

  for (const goal of goals) {
    if (!goal.targetDate) continue;
    items.push({
      id: `goal-${goal.id}`,
      title: goal.title,
      date: goal.targetDate.toISOString(),
      type: "GOAL",
      color: goal.color || typeColor("GOAL"),
      href: "/goals",
    });
  }

  items.sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (diff !== 0) return diff;
    return (a.time ?? "").localeCompare(b.time ?? "");
  });

  return { month: target, items };
}
