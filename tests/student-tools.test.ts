import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { Prisma } from "@prisma/client";
import { academicDate, allocatePlan, localDateKey, nextReview, parseScheduleCsv, overlaps, scheduleKey } from "../src/features/student-tools/algorithms";
import * as schema from "../src/features/student-tools/schema";
import { fail, ok } from "../src/lib/types";
import * as groupSchema from "../src/features/groups/schema";

test("review intervals reset difficult cards and cap long intervals", () => {
  const now = new Date("2026-10-11T08:00:00Z");
  assert.equal(nextReview(0, 0, true, now).intervalDays, 1);
  assert.equal(nextReview(1, 1, true, now).intervalDays, 3);
  assert.equal(nextReview(2, 3, true, now).intervalDays, 6);
  assert.equal(nextReview(20, 180, true, now).intervalDays, 180);
  const hard = nextReview(8, 90, false, now);
  assert.equal(hard.repetitions, 0);
  assert.equal(hard.dueAt.getTime() - now.getTime(), 600_000);
});
test("study plans obey per-day capacity, exclude exam day, and retain completed work", () => {
  const now = new Date("2026-10-10T21:00:00Z"); // October 11 in Uzbekistan
  assert.equal(localDateKey(now), "2026-10-11");
  const topics = [{ name: "Algebra", minutes: 100 }, { name: "Geometry", minutes: 80 }];
  const plan = allocatePlan(topics, 40, academicDate("2026-10-14"), [], now);
  assert.equal(plan.days, 3);
  assert.equal(plan.tasks.reduce((s, t) => s + t.minutes, 0), 120);
  assert.equal(plan.unscheduledMinutes, 60);
  for (const day of new Set(plan.tasks.map((t) => localDateKey(t.date)))) {
    assert.ok(day < "2026-10-14");
    assert.ok(plan.tasks.filter((t) => localDateKey(t.date) === day).reduce((s, t) => s + t.minutes, 0) <= 40);
  }
  const moved = allocatePlan(topics, 80, academicDate("2026-10-14"), [{ topic: "Algebra", minutes: 40 }], new Date("2026-10-12T08:00:00Z"));
  assert.equal(moved.tasks.reduce((s, t) => s + t.minutes, 0), 140);
  assert.equal(moved.tasks.filter((t) => t.topic === "Algebra").reduce((s, t) => s + t.minutes, 0), 60);
  assert.equal(moved.unscheduledMinutes, 0);
  assert.equal(topics[0].minutes, 100);
  const sameDay = allocatePlan(topics, 60, academicDate("2026-10-14"), [{ topic: "Algebra", minutes: 40, date: academicDate("2026-10-11") }], now);
  assert.equal(sameDay.tasks.filter((t) => localDateKey(t.date) === "2026-10-11").reduce((s, t) => s + t.minutes, 0), 20);
  assert.throws(() => academicDate("2026-02-30"));
});
test("CSV handles quoted text and rejects invalid days and reversed times", () => {
  const rows = parseScheduleCsv('\uFEFFtitle,dayOfWeek,startTime,endTime,teacher,room\r\n"Math, advanced",1,09:00,10:20,"Ali ""U""",204');
  assert.equal(rows[0].title, "Math, advanced");
  assert.equal(rows[0].teacher, 'Ali "U"');
  assert.throws(() => parseScheduleCsv("title,dayOfWeek,startTime,endTime\nMath,8,09:00,10:00"));
  assert.throws(() => parseScheduleCsv("title,dayOfWeek,startTime,endTime\nMath,1,11:00,10:00"));
  assert.throws(() => parseScheduleCsv('title,dayOfWeek,startTime,endTime\n"unclosed'));
  assert.equal(overlaps(rows[0], { dayOfWeek: 1, startTime: "10:20", endTime: "11:00" }), false);
  assert.equal(overlaps(rows[0], { dayOfWeek: 1, startTime: "10:00", endTime: "11:00" }), true);
  assert.equal(scheduleKey(rows[0]), scheduleKey({ ...rows[0], title: "MATH, ADVANCED" }));
});
test("deck and opportunity schemas reject duplicate answers, invalid course ranges and unsafe sources", () => {
  assert.equal(schema.cardSchema.safeParse({ question: "Q", answer: "Answer", distractors: ["answer"] }).success, false);
  assert.equal(schema.planSchema.safeParse({ examId: "a", dailyMinutes: 40, topics: [{ name: "X", minutes: 20 }, { name: "x", minutes: 40 }] }).success, false);
  const opportunity = { title: "Internship", organization: "University", kind: "INTERNSHIP", field: "IT", minCourse: 1, maxCourse: 3, language: "B2", requirements: "Some eligibility requirements", deadline: "2026-11-01", url: "https://example.org" };
  assert.equal(schema.opportunitySchema.safeParse(opportunity).success, true);
  assert.equal(schema.opportunitySchema.safeParse({ ...opportunity, minCourse: 4 }).success, false);
  assert.equal(schema.opportunitySchema.safeParse({ ...opportunity, url: "javascript:alert(1)" }).success, false);
});

type Result = { success: boolean; error?: string; data?: unknown };
function loadActions(file: string, db: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const filename = path.resolve(`src/features/student-tools/${file}.ts`);
  const localRequire = createRequire(filename);
  const target = { exports: {} as Record<string, (input: unknown) => Promise<Result>> };
  const deps: Record<string, unknown> = {
    "@/lib/prisma": { prisma: db }, "@/lib/auth/dal": { async verifySession() { return { userId: "student-a" }; } },
    "@/lib/rate-limit": { async consumeRateLimit() { return { allowed: true }; } },
    "@/lib/types": { fail, ok }, "next/cache": { revalidatePath() {} }, "@prisma/client": { Prisma },
    "./schema": schema, "./algorithms": { academicDate, allocatePlan, localDateKey, nextReview, parseScheduleCsv, overlaps, scheduleKey },
    "./ai": { async generateStructured() { throw new Error("AI should not be called"); } }, ...extra,
  };
  runInNewContext(ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: target, exports: target.exports, require: (id: string) => deps[id] ?? localRequire(id), Date, Map, Set, Buffer, File, FormData });
  return target.exports;
}
test("learning mutations constrain foreign decks/cards to the authenticated user", async () => {
  const queries: unknown[] = [];
  let writes = 0;
  const tx = { flashcardDeck: { async findFirst(query: unknown) { queries.push(query); return null; }, async update() { writes++; } } };
  const actions = loadActions("learning-actions", {
    async $transaction(fn: (tx: unknown) => unknown) { return fn(tx); },
    flashcard: { async findFirst(query: unknown) { queries.push(query); return null; }, async updateMany() { writes++; } },
  });
  assert.equal((await actions.saveDeck({ id: "foreign", title: "Test", cards: [{ question: "Q", answer: "A", distractors: [] }] })).success, false);
  assert.equal((await actions.reviewCard({ id: "foreign-card", known: true })).success, false);
  assert.equal((await actions.submitQuiz({ deckId: "foreign", answers: [{ cardId: "c", answer: "a" }] })).success, false);
  assert.equal(writes, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(queries)), [{ where: { id: "foreign", userId: "student-a" }, include: { cards: true } }, { where: { id: "foreign-card", deck: { userId: "student-a" } } }, { where: { id: "foreign", userId: "student-a" }, include: { cards: true } }]);
});
test("quizzes grade against stored answers, persist history and reset wrong cards", async () => {
  let stored: unknown, reset: unknown;
  const actions = loadActions("learning-actions", { async $transaction(fn: (tx: unknown) => unknown) { return fn({
    flashcardDeck: { async findFirst() { return { id: "deck", cards: [{ id: "a", question: "A?", answer: "Yes" }, { id: "b", question: "B?", answer: "No" }] }; } },
    quizAttempt: { async create(data: unknown) { stored = data; } },
    flashcard: { async updateMany(data: unknown) { reset = data; } },
  }); } });
  const result = await actions.submitQuiz({ deckId: "deck", answers: [{ cardId: "a", answer: "yes" }, { cardId: "b", answer: "wrong" }] });
  assert.equal(result.success, true);
  assert.deepEqual(JSON.parse(JSON.stringify(stored)), { data: { userId: "student-a", deckId: "deck", correct: 1, total: 2 } });
  assert.deepEqual((JSON.parse(JSON.stringify(reset)) as { where: unknown }).where, { deckId: "deck", id: { in: ["b"] } });
  assert.equal((await actions.submitQuiz({ deckId: "deck", answers: [{ cardId: "a", answer: "Yes" }, { cardId: "a", answer: "Yes" }] })).success, false);
});
test("opportunity verification rejects students and permits only server-authorized admins", async () => {
  let writes = 0;
  const db = { user: { async findUnique() { return { role: "STUDENT" }; } }, opportunity: { async updateMany() { writes++; return { count: 1 }; } } };
  const actions = loadActions("opportunity-actions", db);
  assert.equal((await actions.verifyOpportunity({ id: "opportunity", verified: true })).success, false);
  assert.equal(writes, 0);
  db.user.findUnique = async () => ({ role: "ADMIN" });
  assert.equal((await actions.verifyOpportunity({ id: "opportunity", verified: true })).success, true);
  assert.equal(writes, 1);
});
test("import saves atomically, skips duplicates and blocks overlapping classes", async () => {
  let inserts: { data: unknown[] } | undefined;
  const existing = [{ title: "Math", dayOfWeek: 1, startTime: "09:00", endTime: "10:00" }];
  const actions = loadActions("import-actions", { async $transaction(fn: (tx: unknown) => unknown) { return fn({ schedule: { async findMany() { return existing; }, async createMany(data: { data: unknown[] }) { inserts = data; } } }); } });
  const row = { ...existing[0], teacher: "", room: "" };
  const okResult = await actions.confirmScheduleImport([row, { ...row, title: "English", startTime: "10:00", endTime: "11:00" }]);
  assert.equal(okResult.success, true);
  assert.equal(inserts?.data.length, 1);
  assert.equal((inserts?.data[0] as { userId: string }).userId, "student-a");
  inserts = undefined;
  assert.equal((await actions.confirmScheduleImport([{ ...row, title: "Conflicting" }])).success, false);
  assert.equal(inserts, undefined);
});

test("group replies reject nonmembers and accepted answers require question-author/owner rights", async () => {
  const lookups: unknown[] = []; let writes = 0;
  const db = {
    groupPost: { async findFirst(query: unknown) { lookups.push(query); return null; } },
    groupReply: { async create() { writes++; } },
    async $transaction(fn: (tx: unknown) => unknown) { return fn({ groupReply: { async findFirst(query: unknown) { lookups.push(query); return null; }, async updateMany() { writes++; } } }); },
  };
  const actions = loadActions("../groups/actions", db, { "./schema": groupSchema });
  assert.equal((await actions.replyToQuestion({ postId: "foreign", content: "Answer" })).success, false);
  assert.equal((await actions.acceptQuestionReply({ id: "foreign-reply", accepted: true })).success, false);
  assert.equal(writes, 0);
  const serialized = JSON.parse(JSON.stringify(lookups));
  assert.deepEqual(serialized[0].where.group, { members: { some: { userId: "student-a" } } });
  assert.deepEqual(serialized[1].where.post.OR, [{ authorId: "student-a" }, { group: { ownerId: "student-a" } }]);
});

test("study reminders respect preference filters and repeated runs never duplicate notices or pushes", async () => {
  const keys = new Set<string>(); const records: unknown[] = []; const pushes: unknown[] = []; const queries: unknown[] = [];
  const preference = { OR: [{ profile: { is: null } }, { profile: { is: { notificationsEnabled: true } } }] };
  const db = {
    user: { async findMany(query: unknown) { queries.push(query); return [{ id: "student-a" }]; } },
    flashcard: { async count() { return 3; } }, studyPlanTask: { async count() { return 2; } },
    savedOpportunity: { async findMany() { return [{ opportunity: { id: "grant", title: "Grant", deadline: academicDate("2026-10-13") } }]; } },
    async $transaction(fn: (tx: unknown) => unknown) { return fn({
      toolReminder: { async findUnique({ where }: { where: { userId_key: { key: string } } }) { return keys.has(where.userId_key.key) ? {} : null; }, async create({ data }: { data: { key: string } }) { keys.add(data.key); } },
      notification: { async create(query: unknown) { records.push(query); } },
    }); },
  };
  const actions = loadActions("reminders", db, { "server-only": {}, "@/features/notifications/preferences": { notificationRecipientsWhere: preference }, "@/features/notifications/push": { async sendPushToUser(...args: unknown[]) { pushes.push(args); } } }) as unknown as { deliverStudyReminders(now: Date): Promise<{ created: number }> };
  const now = new Date("2026-10-11T08:00:00Z");
  assert.equal((await actions.deliverStudyReminders(now)).created, 3);
  assert.equal((await actions.deliverStudyReminders(now)).created, 0);
  assert.equal(records.length, 3); assert.equal(pushes.length, 3);
  const filter = JSON.parse(JSON.stringify(queries[0])).where;
  assert.deepEqual(filter.AND[0], preference);
});
