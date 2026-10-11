import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as dates from "../src/lib/date";
import * as formats from "../src/lib/format";
import { finishTimer, initialTimerState, remainingTime, restoreTimer } from "../src/features/focus/timer-state";
import { studySessionSchema } from "../src/features/focus/schema";
import { literalSearch } from "../src/lib/list-query";
import * as paging from "../src/lib/pagination";
import { fail, ok } from "../src/lib/types";

function load<T>(file: string, deps: Record<string, unknown>): T {
  const filename = path.resolve(file), localRequire = createRequire(filename);
  const target = { exports: {} };
  const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, { module: target, exports: target.exports, require: (id: string) => id in deps ? deps[id] : localRequire(id), Date, URL });
  return target.exports as T;
}

test("academic dates and formatted calendar fields stay identical across host timezones", () => {
  const old = process.env.TZ;
  try {
    for (const timezone of ["UTC", "Asia/Tashkent", "America/Los_Angeles"]) {
      process.env.TZ = timezone;
      const date = new Date("2026-10-31T20:00:00Z");
      assert.equal(dates.localDateKey(date), "2026-11-01");
      assert.equal(formats.formatDate(date, "yyyy-MM-dd HH:mm"), "2026-11-01 01:00");
      assert.equal(dates.dayRange(date).start.toISOString(), "2026-10-31T19:00:00.000Z");
      assert.equal(dates.weekRange(date).start.toISOString(), "2026-10-25T19:00:00.000Z");
      assert.equal(dates.monthRange("2026-11").end.toISOString(), "2026-11-30T18:59:59.999Z");
      assert.equal(dates.parseAcademicDateTime("2026-11-01T09:30").toISOString(), "2026-11-01T04:30:00.000Z");
      assert.equal(formats.formatDate(date, "MMMM"), "Noyabr");
    }
  } finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; }
});

test("month navigation and leap-year boundaries use calendar months", () => {
  assert.equal(dates.shiftMonth("2026-01", -1), "2025-12");
  assert.equal(dates.shiftMonth("2026-12", 1), "2027-01");
  assert.equal(dates.monthRange("2024-02").end.toISOString(), "2024-02-29T18:59:59.999Z");
  assert.throws(() => dates.academicDate("2026-02-29"));
});

test("a running timer survives reload and expires into exactly one pending session", () => {
  const sessionId = "60c70f84-a124-4a39-8bc4-0de0c8de3bde";
  const state = { ...initialTimerState(), running: true, endsAt: 2_000_000, sessionId, subjectId: "math" };
  const restored = restoreTimer(JSON.stringify(state));
  assert.equal(remainingTime(restored, 1_900_000), 100_000);
  const done = finishTimer(restored, 10_000_000);
  assert.equal(done.phase, "break");
  assert.equal(done.running, false);
  assert.equal(done.pending?.sessionId, sessionId);
  assert.equal(done.pending?.durationMin, 25);
  assert.equal(done.pending?.endedAt, new Date(2_000_000).toISOString());
  assert.equal(finishTimer(done, 20_000_000), done);
  assert.deepEqual(restoreTimer(JSON.stringify(done)), done);
});

test("paused timer time survives reload and corrupt snapshots are discarded", () => {
  const state = { ...initialTimerState(), remaining: 100_000 };
  assert.equal(remainingTime(restoreTimer(JSON.stringify(state)), 9_000_000), 100_000);
  for (const raw of ["bad json", JSON.stringify({ ...state, version: 0 }), JSON.stringify({ ...state, running: true, endsAt: null }), JSON.stringify({ ...state, modeId: "fake" })]) {
    assert.deepEqual(restoreTimer(raw), initialTimerState());
  }
});

test("focus retries save one user-namespaced session and retain actual completion time", async () => {
  const stored = new Map<string, unknown>();
  const action = load<{ saveStudySession(input: unknown): Promise<{ success: boolean; data?: { id: string } }> }>("src/features/focus/actions.ts", {
    "next/cache": { revalidatePath() {} }, "@/lib/auth/dal": { async verifySession() { return { userId: "owner" }; } },
    "@/lib/ownership": { async ownsSubject() { return true; } }, "@/lib/types": { fail, ok }, "./schema": { studySessionSchema },
    "@/lib/prisma": { prisma: { studySession: { async upsert({ where, create }: { where: { id: string }; create: { id: string } }) { if (!stored.has(where.id)) stored.set(where.id, create); return stored.get(where.id); } } } },
  });
  const input = { sessionId: "60c70f84-a124-4a39-8bc4-0de0c8de3bde", mode: "POMODORO_25", durationMin: 25, endedAt: "2026-01-01T10:00:00Z" };
  assert.equal((await action.saveStudySession(input)).success, true);
  assert.equal((await action.saveStudySession(input)).success, true);
  assert.equal(stored.size, 1);
  const entry = [...stored.values()][0] as { id: string; endedAt: Date };
  assert.equal(entry.id, `focus:owner:${input.sessionId}`);
  assert.equal(entry.endedAt.toISOString(), "2026-01-01T10:00:00.000Z");
  assert.equal((await action.saveStudySession({ ...input, durationMin: 181 })).success, false);
});

test("search pages expose the ninth-result continuation and preserve ownership and literal text", async () => {
  const seen: Record<string, { skip: number; take: number; where: { userId?: string; OR?: { title?: { contains: string } }[] } }> = {};
  const models = ["note", "task", "homework", "exam", "material", "event", "goal", "subject", "transitStop", "flashcardDeck", "studyPlan", "groupPost", "opportunity"];
  const db = Object.fromEntries(models.map((model) => [model, { async findMany(args: typeof seen[string]) {
    seen[model] = args;
    if (model !== "note") return [];
    return Array.from({ length: args.skip === 0 ? 9 : 2 }, (_, i) => ({ id: String(args.skip + i), title: "50%_", content: "full text", tags: [], updatedAt: new Date() }));
  } }]));
  const queries = load<{ globalSearch(userId: string, q: string, params?: Record<string, string>): Promise<{ groups: { notes: { id: string; href: string }[] }; pages: { notes: { hasMore: boolean; page: number } } }> }>("src/features/search/queries.ts", {
    "server-only": {}, "@/lib/prisma": { prisma: db }, "@/lib/format": formats, "@/lib/list-query": { literalSearch }, "@/lib/pagination": paging,
  });
  const first = await queries.globalSearch("owner", "50%_");
  assert.equal(first.groups.notes.length, 8);
  assert.equal(first.pages.notes.hasMore, true);
  assert.equal(first.groups.notes[0].href, "/search/notes/0");
  assert.equal(seen.note.where.userId, "owner");
  assert.equal(seen.note.where.OR?.[0].title?.contains, "50\\%\\_");
  const second = await queries.globalSearch("owner", "50%_", { notesPage: "2" });
  assert.deepEqual(second.groups.notes.map((item) => item.id), ["8", "9"]);
  assert.equal(second.pages.notes.hasMore, false);
  assert.equal(seen.task.skip, 0);
});

test("search detail blocks foreign records and unsafe external URLs", async () => {
  let where: unknown;
  const detail = load<{ getSearchDetail(userId: string, kind: string, id: string): Promise<unknown>; safeExternalUrl(value: string): string | null }>("src/features/search/detail.ts", {
    "server-only": {}, "@/lib/format": formats,
    "@/lib/prisma": { prisma: { note: { async findFirst(query: { where: unknown }) { where = query.where; return null; } } } },
  });
  assert.equal(await detail.getSearchDetail("owner", "notes", "foreign"), null);
  assert.deepEqual(JSON.parse(JSON.stringify(where)), { id: "foreign", userId: "owner" });
  assert.equal(await detail.getSearchDetail("owner", "unknown", "x"), null);
  assert.equal(detail.safeExternalUrl("javascript:alert(1)"), null);
  assert.equal(detail.safeExternalUrl("https://example.com"), "https://example.com/");
});

test("budget falls back to profile settings but an explicit monthly zero overrides them", async () => {
  let budget: { amount: number } | null = null;
  const query = load<{ getBudgetData(month: string): Promise<{ budget: number }> }>("src/features/budget/queries.ts", {
    "server-only": {}, "@/lib/auth/dal": { async verifySession() { return { userId: "owner" }; } },
    "@/lib/date": dates, "@/lib/pagination": paging,
    "@/lib/prisma": { prisma: {
      budget: { async findUnique() { return budget; } }, studentProfile: { async findUnique() { return { monthlyBudget: 500_000 }; } },
      expense: { async count() { return 0; }, async findMany() { return []; }, async groupBy() { return []; } },
    } },
  });
  assert.equal((await query.getBudgetData("2026-10")).budget, 500_000);
  budget = { amount: 0 };
  assert.equal((await query.getBudgetData("2026-10")).budget, 0);
  budget = { amount: 700_000 };
  assert.equal((await query.getBudgetData("2026-10")).budget, 700_000);
});
