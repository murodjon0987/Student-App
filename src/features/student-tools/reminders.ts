import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/features/notifications/push";
import { notificationRecipientsWhere } from "@/features/notifications/preferences";
import { academicDate, academicTimestamp, localDateKey } from "./algorithms";
import { parseAcademicDateTime } from "@/lib/date";

interface ReminderNotice {
  key: string;
  title: string;
  message: string;
  link: string;
}

// Writes the notification and its dedup marker atomically, then pushes once.
// Concurrent cron deliveries must not create and send the same reminder twice.
async function persistNotice(
  userId: string,
  notice: ReminderNotice,
  now: Date
): Promise<boolean> {
  let inserted = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      inserted = await prisma.$transaction(
        async (tx) => {
          if (
            await tx.toolReminder.findUnique({
              where: { userId_key: { userId, key: notice.key } },
            })
          ) {
            return false;
          }
          await tx.toolReminder.create({
            data: { userId, key: notice.key, createdAt: now },
          });
          await tx.notification.create({
            data: {
              userId,
              title: notice.title,
              message: notice.message,
              link: notice.link,
              type: "REMINDER",
              createdAt: now,
            },
          });
          return true;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      break;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        break;
      }
      if (
        !(e instanceof Prisma.PrismaClientKnownRequestError) ||
        e.code !== "P2034" ||
        attempt === 2
      ) {
        throw e;
      }
    }
  }
  if (inserted) {
    await sendPushToUser(userId, {
      title: notice.title,
      body: notice.message,
      url: notice.link,
      tag: notice.key,
    });
  }
  return inserted;
}

export async function deliverStudyReminders(now = new Date()) {
  const day = localDateKey(now), start = academicDate(day), end = new Date(start.getTime() + 86_400_000);
  const deadlineEnd = new Date(now.getTime() + 3 * 86_400_000);
  let cursor: string | undefined, created = 0;
  while (true) {
    const users = await prisma.user.findMany({
      where: { AND: [notificationRecipientsWhere, { OR: [
        { flashcardDecks: { some: { cards: { some: { dueAt: { lte: now } } } } } },
        { studyPlans: { some: { tasks: { some: { done: false, date: { gte: start, lt: end } } } } } },
        { savedOpportunities: { some: { opportunity: { deadline: { gte: now, lte: deadlineEnd } } } } },
      ] }], ...(cursor ? { id: { gt: cursor } } : {}) }, orderBy: { id: "asc" }, take: 200, select: { id: true },
    });
    for (const user of users) {
      const [cards, tasks, opportunities] = await Promise.all([
        prisma.flashcard.count({ where: { deck: { userId: user.id }, dueAt: { lte: now } } }),
        prisma.studyPlanTask.count({ where: { plan: { userId: user.id }, done: false, date: { gte: start, lt: end } } }),
        prisma.savedOpportunity.findMany({ where: { userId: user.id, opportunity: { deadline: { gte: now, lte: deadlineEnd } } }, take: 20, orderBy: { opportunity: { deadline: "asc" } }, include: { opportunity: { select: { id: true, title: true, deadline: true } } } }),
      ]);
      const notices: ReminderNotice[] = [];
      if (cards) notices.push({ key: `cards:${day}`, title: "Takrorlash vaqti", message: `${cards} ta kartochkangiz takrorlashni kutmoqda.`, link: "/learn" });
      if (tasks) notices.push({ key: `plan:${day}`, title: "Bugungi tayyorgarlik", message: `Imtihon rejangizda bugun ${tasks} ta mashg'ulot bor.`, link: "/study-plans" });
      for (const { opportunity: o } of opportunities) notices.push({ key: `opportunity:${o.id}:${o.deadline.toISOString()}`, title: "Ariza muddati yaqinlashmoqda", message: `${o.title}: muddat ${localDateKey(o.deadline)}.`, link: "/opportunities?saved=1&course=all" });
      for (const notice of notices) {
        if (await persistNotice(user.id, notice, now)) created++;
      }
    }
    if (users.length < 200) break;
    cursor = users[users.length - 1].id;
  }
  return { created };
}

const HOUR_MS = 3_600_000;

function examInstant(exam: { date: Date; time: string | null }): Date {
  const key = localDateKey(exam.date);
  const time = /^\d{2}:\d{2}$/.test(exam.time ?? "") ? (exam.time as string) : "00:00";
  const parsed = parseAcademicDateTime(`${key}T${time}`);
  return Number.isNaN(parsed.getTime()) ? exam.date : parsed;
}

// Reminds about Task, Homework and Exam deadlines at 24 hours and 1 hour before.
// Completed items are excluded and each window fires exactly once per record.
export async function deliverDeadlineReminders(now = new Date()) {
  const windows = [
    { id: "1h", from: now, to: new Date(now.getTime() + HOUR_MS) },
    {
      id: "24h",
      from: new Date(now.getTime() + HOUR_MS),
      to: new Date(now.getTime() + 24 * HOUR_MS),
    },
  ];

  let created = 0;
  const examWindowStart = academicDate(localDateKey(now));
  const examWindowEnd = new Date(now.getTime() + 25 * HOUR_MS);
  const exams = await prisma.exam.findMany({
    where: {
      date: { gte: examWindowStart, lte: examWindowEnd },
      user: { is: notificationRecipientsWhere },
    },
    select: { id: true, title: true, date: true, time: true, userId: true },
    take: 1000,
  });

  for (const window of windows) {
    const range = { gt: window.from, lte: window.to };
    const [tasks, homeworks] = await Promise.all([
      prisma.task.findMany({
        where: {
          deadline: range,
          status: { not: "COMPLETED" },
          user: { is: notificationRecipientsWhere },
        },
        select: { id: true, title: true, deadline: true, userId: true },
        take: 500,
      }),
      prisma.homework.findMany({
        where: {
          deadline: range,
          status: { not: "COMPLETED" },
          user: { is: notificationRecipientsWhere },
        },
        select: { id: true, title: true, deadline: true, userId: true },
        take: 500,
      }),
    ]);

    for (const task of tasks) {
      if (!task.deadline) continue;
      const notice: ReminderNotice = {
        key: `task:${task.id}:${window.id}`,
        title: "Vazifa muddati yaqinlashmoqda",
        message: `"${task.title}" — muddat ${academicTimestamp(task.deadline.toISOString())}.`,
        link: "/tasks",
      };
      if (await persistNotice(task.userId, notice, now)) created++;
    }

    for (const homework of homeworks) {
      if (!homework.deadline) continue;
      const notice: ReminderNotice = {
        key: `homework:${homework.id}:${window.id}`,
        title: "Uy vazifasi muddati yaqinlashmoqda",
        message: `"${homework.title}" — muddat ${academicTimestamp(homework.deadline.toISOString())}.`,
        link: "/homework",
      };
      if (await persistNotice(homework.userId, notice, now)) created++;
    }

    for (const exam of exams) {
      const instant = examInstant(exam);
      if (
        instant.getTime() > window.from.getTime() &&
        instant.getTime() <= window.to.getTime()
      ) {
        const notice: ReminderNotice = {
          key: `exam:${exam.id}:${window.id}`,
          title: "Imtihon yaqinlashmoqda",
          message: `"${exam.title}" — ${academicTimestamp(instant.toISOString())}.`,
          link: "/exams",
        };
        if (await persistNotice(exam.userId, notice, now)) created++;
      }
    }
  }

  return { created };
}
