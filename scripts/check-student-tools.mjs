// Explicit integration check against DATABASE_URL. Creates an isolated synthetic
// account and removes only that account's records. Never use real student data.
import "dotenv/config";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import path from "node:path";
import ts from "typescript";
import bcrypt from "bcryptjs";
import { PrismaClient, Prisma } from "@prisma/client";
import * as schema from "../src/features/student-tools/schema.ts";
import * as algorithms from "../src/features/student-tools/algorithms.ts";
import * as groupSchema from "../src/features/groups/schema.ts";
import { fail, ok } from "../src/lib/types.ts";

const db = new PrismaClient();
const marker = path.resolve("scripts/.student-tools-smoke.json");
const mode = process.argv[2];
const password = "StudentToolsSmoke2026!";
let user;
function load(file, extra = {}) {
  const filename = path.resolve(`src/features/${file}.ts`), localRequire = createRequire(filename);
  const target = { exports: {} };
  const deps = { "@/lib/prisma": { prisma: db }, "@/lib/auth/dal": { async verifySession() { return { userId: user.id }; } }, "@/lib/rate-limit": { async consumeRateLimit() { return { allowed: true }; } }, "@/lib/types": { fail, ok }, "next/cache": { revalidatePath() {} }, "@prisma/client": { Prisma }, "./schema": schema, "./algorithms": algorithms, "./ai": { async generateStructured() { return [{ question: "2 + 2?", answer: "4", distractors: ["3", "5", "6"] }]; } }, ...extra };
  runInNewContext(ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: target, exports: target.exports, require: (id) => deps[id] ?? localRequire(id), Date, Map, Set, Buffer, File, FormData });
  return target.exports;
}
async function cleanup() {
  const fixture = JSON.parse(readFileSync(marker, "utf8"));
  if (!fixture.email.startsWith("student-tools-smoke-") || !fixture.email.endsWith("@example.invalid")) throw new Error("Not a synthetic fixture");
  await db.user.deleteMany({ where: { id: fixture.id, email: fixture.email } });
  unlinkSync(marker);
}
try {
  if (mode === "--cleanup") { if (existsSync(marker)) await cleanup(); console.log("Synthetic fixture removed."); }
  else if (mode === "--run" || mode === "--setup") {
    if (existsSync(marker)) throw new Error("Remove the previous synthetic fixture with --cleanup first");
    user = await db.user.create({ data: { email: `student-tools-smoke-${Date.now()}@example.invalid`, name: "Sinov talaba", passwordHash: await bcrypt.hash(password, 10), profile: { create: { notificationsEnabled: false, course: 2 } } } });
    writeFileSync(marker, JSON.stringify({ id: user.id, email: user.email }));
    try {
      const learning = load("student-tools/learning-actions");
      const generated = await learning.generateCards({ source: "Ikki qo'shuv ikki to'rt bo'ladi. Arifmetik qo'shish." }); assert.equal(generated.success, true);
      const deck = await learning.saveDeck({ title: "Sinov: matematika", subject: "Matematika", cards: generated.data }); assert.equal(deck.success, true);
      const cards = await db.flashcard.findMany({ where: { deckId: deck.data.id } });
      assert.equal((await learning.reviewCard({ id: cards[0].id, known: true })).success, true);
      assert.equal((await learning.reviewCard({ id: cards[0].id, known: true })).success, false);
      assert.equal((await learning.submitQuiz({ deckId: deck.data.id, answers: [{ cardId: cards[0].id, answer: "wrong" }] })).success, true);
      assert.equal((await db.flashcard.findUnique({ where: { id: cards[0].id } })).repetitions, 0);
      const correct = await learning.submitQuiz({ deckId: deck.data.id, answers: [{ cardId: cards[0].id, answer: "4" }] }); assert.equal(correct.data.correct, 1);
      const note = await db.note.create({ data: { userId: user.id, title: "Sinov konspekt", content: "Ikki qo'shuv ikki to'rt bo'ladi. Arifmetik qo'shish." } });
      assert.equal((await learning.generateCards({ noteId: note.id })).success, true);

      const exam = await db.exam.create({ data: { userId: user.id, title: "Sinov imtihon", date: new Date(Date.now() + 7 * 86_400_000) } });
      const plans = load("student-tools/plan-actions");
      const plan = await plans.saveStudyPlan({ examId: exam.id, dailyMinutes: 40, topics: [{ name: "Algebra", minutes: 120 }, { name: "Geometriya", minutes: 80 }] }); assert.equal(plan.success, true);
      const task = await db.studyPlanTask.findFirst({ where: { planId: plan.data.id }, orderBy: { date: "asc" } });
      assert.equal((await plans.completePlanTask({ id: task.id, done: true })).success, true);
      assert.ok((await db.exam.findUnique({ where: { id: exam.id } })).prepProgress > 0);
      assert.equal((await plans.reschedulePlan({ id: plan.data.id, dailyMinutes: 60 })).success, true);
      assert.equal((await db.studyPlanTask.findUnique({ where: { id: task.id } })).done, true);

      const groups = load("groups/actions", { "./schema": groupSchema });
      assert.equal((await groups.createGroup({ name: "Sinov guruhi", university: "Sinov universiteti" })).success, true);
      const group = await db.studentGroup.findFirst({ where: { ownerId: user.id } });
      assert.equal((await groups.publishGroupPost({ groupId: group.id, kind: "QUESTION", title: "Sinov savol: integral", content: "Integralni qanday hisoblaymiz?", subject: "Matematika", topic: "Integrallar" })).success, true);
      const post = await db.groupPost.findFirst({ where: { groupId: group.id } });
      assert.equal((await groups.replyToQuestion({ postId: post.id, content: "Avval boshlang'ich funksiyani topamiz." })).success, true);
      const reply = await db.groupReply.findFirst({ where: { postId: post.id } });
      assert.equal((await groups.acceptQuestionReply({ id: reply.id, accepted: true })).success, true);
      assert.equal((await db.groupReply.findUnique({ where: { id: reply.id } })).accepted, true);

      const importing = load("student-tools/import-actions");
      const csv = new FormData(); csv.set("file", new File([readFileSync("public/schedule-template.csv")], "schedule.csv", { type: "text/csv" }));
      const preview = await importing.previewScheduleImport(csv); assert.equal(preview.success, true);
      assert.equal((await importing.confirmScheduleImport(preview.data)).data.count, 2);
      assert.equal((await importing.confirmScheduleImport(preview.data)).data.count, 0);
      const opportunities = load("student-tools/opportunity-actions");
      const deadline = algorithms.localDateKey(new Date(Date.now() + 2 * 86_400_000));
      assert.equal((await opportunities.saveOpportunity({ title: "Sinov e'loni (haqiqiy imkoniyat emas)", organization: "Sinov", kind: "INTERNSHIP", field: "IT", minCourse: 1, maxCourse: 4, language: "B2", requirements: "Faqat avtomatik tekshiruv uchun vaqtinchalik e'lon.", url: "https://example.org", deadline })).success, true);
      const opportunity = await db.opportunity.findFirst({ where: { userId: user.id } });
      assert.equal((await opportunities.bookmarkOpportunity({ id: opportunity.id, saved: true })).success, true);
      assert.equal((await opportunities.verifyOpportunity({ id: opportunity.id, verified: true })).success, false);
      // Remove public test content immediately; keep only private learning data for UI setup.
      assert.equal((await opportunities.deleteOpportunity(opportunity.id)).success, true);
      console.log("All five feature workflows passed against the configured database.");
      if (mode === "--setup") console.log(`Synthetic UI login: ${user.email} / ${password}`);
    } finally { if (mode === "--run") await cleanup(); }
  } else throw new Error("Choose --run (check + cleanup), --setup (private UI fixture), or --cleanup");
} finally { await db.$disconnect(); }
