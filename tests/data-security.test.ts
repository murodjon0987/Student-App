import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { Prisma } from "@prisma/client";

import { ownsSubject } from "../src/lib/ownership";
import { deleteUserContent } from "../src/lib/user-data";
import { prisma } from "../src/lib/prisma";
import { fail, ok } from "../src/lib/types";

const currentUser = "student-a";
const subjects = [
  { id: "own-subject", userId: currentUser },
  { id: "foreign-subject", userId: "student-b" },
];
const subjectLookup = {
  subject: {
    async findFirst({ where }: { where: { id: string; userId: string } }) {
      return subjects.find((row) => row.id === where.id && row.userId === where.userId) ?? null;
    },
  },
};

test("optional subjects are accepted, while foreign and missing subjects are rejected", async () => {
  for (const subjectId of [undefined, null, ""]) {
    assert.equal(await ownsSubject(currentUser, subjectId, subjectLookup), true);
  }
  assert.equal(await ownsSubject(currentUser, "own-subject", subjectLookup), true);
  assert.equal(await ownsSubject(currentUser, "foreign-subject", subjectLookup), false);
  assert.equal(await ownsSubject(currentUser, "missing-subject", subjectLookup), false);
});

type Mutation = { where?: { userId?: string }; data: { userId?: string; subjectId?: string | null } };
type SaveAction = (input: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;

function loadServerModule<T>(filename: string, dependencies: Record<string, unknown>): T {
  const localRequire = createRequire(filename);
  const testModule = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  runInNewContext(outputText, {
    module: testModule,
    exports: testModule.exports,
    require: (id: string) => dependencies[id] ?? localRequire(id),
  }, { filename });
  return testModule.exports as T;
}

// Execute the real action code with authenticated-user, DB and Next request dependencies replaced.
// This checks every create/update boundary without connecting to a real or production database.
function loadAction(feature: string, model: string, writes: Mutation[]) {
  const filename = path.resolve("src/features", feature, "actions.ts");
  const db = {
    [model]: {
      async findFirst() { return { id: "existing-record", completedAt: null }; },
      async create(args: Mutation) { writes.push(args); return { id: "created-record" }; },
      async update(args: Mutation) { writes.push(args); return { id: "existing-record" }; },
    },
  };
  const dependencies: Record<string, unknown> = {
    "next/cache": { revalidatePath() {} },
    "@/lib/prisma": { prisma: db },
    "@/lib/auth/dal": { async verifySession() { return { userId: currentUser }; } },
    "@/lib/ownership": {
      ownsSubject: (userId: string, subjectId: string | null | undefined) =>
        ownsSubject(userId, subjectId, subjectLookup),
    },
    "@/lib/types": { fail, ok },
  };
  return loadServerModule<Record<string, SaveAction>>(filename, dependencies);
}

const cases = [
  { feature: "tasks", model: "task", action: "saveTask", input: { title: "Task", priority: "MEDIUM", status: "PENDING" } },
  { feature: "homework", model: "homework", action: "saveHomework", input: { title: "Homework", priority: "MEDIUM", status: "PENDING" } },
  { feature: "notes", model: "note", action: "saveNote", input: { title: "Note", content: "", tags: [] } },
  { feature: "materials", model: "material", action: "saveMaterial", input: { title: "Material", category: "OTHER" } },
  { feature: "schedule", model: "schedule", action: "saveSchedule", input: { title: "Class", dayOfWeek: 1, startTime: "09:00", endTime: "10:00", color: "#6366f1" } },
  { feature: "exams", model: "exam", action: "saveExam", input: { title: "Exam", date: "2026-10-20", prepProgress: 0 } },
  { feature: "focus", model: "studySession", action: "saveStudySession", input: { durationMin: 25, mode: "POMODORO_25" } },
];

for (const item of cases) {
  test(`${item.feature} create/update rejects another student's subject before writing`, async () => {
    const writes: Mutation[] = [];
    const save = loadAction(item.feature, item.model, writes)[item.action];
    for (const subjectId of ["foreign-subject", "missing-subject"]) {
      for (const id of [undefined, "existing-record"]) {
        const result = await save({ ...item.input, subjectId, id });
        assert.equal(result.success, false);
        assert.equal(result.error, "Fan topilmadi");
      }
    }
    assert.equal(writes.length, 0);

    const result = await save({ ...item.input, subjectId: "own-subject" });
    assert.equal(result.success, true);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].data.userId, currentUser);
    assert.equal(writes[0].data.subjectId, "own-subject");

    if (item.feature !== "focus") {
      const updated = await save({ ...item.input, subjectId: "own-subject", id: "existing-record" });
      assert.equal(updated.success, true);
      assert.equal(writes[1].where?.userId, currentUser);
    }
  });
}

test("clear-data deletes every user-owned content model in one transaction and preserves account/profile", async () => {
  const schema = readFileSync(path.resolve("prisma/schema.prisma"), "utf8");
  const userOwnedModels = [...schema.matchAll(/model\s+(\w+)\s*\{([^}]+)\}/g)]
    .filter(([, , body]) => /\buserId\s+String\b/.test(body))
    .map(([, name]) => name[0].toLowerCase() + name.slice(1))
    .filter((name) => name !== "studentProfile");
  const contentModels = [...userOwnedModels, "groupPost", "studentGroup", "groupReply"];
  const calls: { model: string; where: { userId?: string; authorId?: string; ownerId?: string } }[] = [];
  const operations: object[] = [];
  let transactions = 0;
  const db: Record<string, unknown> = {
    async $transaction(items: object[]) {
      transactions++;
      assert.deepEqual(items, operations);
    },
  };
  for (const model of contentModels) {
    db[model] = {
      deleteMany({ where }: { where: { userId?: string; authorId?: string; ownerId?: string } }) {
        calls.push({ model, where });
        const operation = {};
        operations.push(operation);
        return operation;
      },
    };
  }

  await deleteUserContent(currentUser, db as unknown as typeof prisma);
  assert.equal(transactions, 1);
  assert.deepEqual(calls.map((call) => call.model).sort(), contentModels.sort());
  assert.ok(calls.every((call) => (call.where.userId ?? call.where.authorId ?? call.where.ownerId) === currentUser));
});

test("account deletion clears the session cookie before redirecting to login", async () => {
  const operations: string[] = [];
  const actions = loadServerModule<{ deleteAccount(): Promise<void> }>(
    path.resolve("src/features/settings/actions.ts"), {
      "next/cache": { revalidatePath() {} },
      "next/navigation": {
        redirect(url: string) { operations.push(`redirect:${url}`); throw new Error("Redirect"); },
      },
      "@/lib/prisma": {
        prisma: { user: { async delete({ where }: { where: { id: string } }) { operations.push(`delete:${where.id}`); } } },
      },
      "@/lib/auth/dal": { async verifySession() { return { userId: currentUser }; } },
      "@/lib/auth/session": { async deleteSession() { operations.push("clear-session-cookie"); } },
      "@/lib/user-data": { async deleteUserContent() {} },
      "@/lib/types": { fail, ok },
    }
  );
  await assert.rejects(actions.deleteAccount(), /Redirect/);
  assert.deepEqual(operations, [`delete:${currentUser}`, "clear-session-cookie", "redirect:/login"]);
});

test("AI context hides foreign subject names in historical malformed relations", async () => {
  const scopedJoins: (string | undefined)[] = [];
  type Query = { include: { subject: { where?: { userId: string } } } };
  const lookup = {
    async findMany(query: Query) {
      const userId = query.include.subject.where?.userId;
      scopedJoins.push(userId);
      return [{
        title: "Current student's task",
        priority: "MEDIUM",
        date: new Date("2026-10-20"),
        prepProgress: 0,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        subject: userId === currentUser ? null : { name: "OTHER STUDENT SECRET" },
      }];
    },
  };
  const empty = { async findMany() { return []; } };
  const context = loadServerModule<{ buildStudentContext(userId: string): Promise<string> }>(
    path.resolve("src/features/ai/context.ts"), {
      "server-only": {},
      "@/lib/prisma": {
        prisma: {
          user: { async findUnique() { return { name: "Student A", profile: null }; } },
          subject: empty, schedule: lookup, task: lookup, homework: lookup, exam: lookup,
          note: empty, expense: empty, goal: empty, transitLine: empty, transitFare: empty,
          budget: { async findFirst() { return null; } },
        },
      },
      "@/lib/format": {
        formatCurrency: () => "0", formatDate: () => "2026-10-20",
        formatUzFullDate: () => "2026-10-10", weekdayName: () => "Dushanba",
      },
    }
  );
  const result = await context.buildStudentContext(currentUser);
  assert.ok(result.includes("Current student's task"));
  assert.equal(result.includes("OTHER STUDENT SECRET"), false);
  assert.deepEqual(scopedJoins, [currentUser, currentUser, currentUser, currentUser]);
});

type AuthState = { message?: string; errors?: Record<string, string[] | undefined> } | undefined;
type AuthAction = (state: undefined, form: FormData) => Promise<AuthState>;

function loadAuthActions(overrides: Record<string, unknown> = {}) {
  const user = { id: currentUser, passwordHash: "hash", sessionVersion: 2 };
  return loadServerModule<Record<string, AuthAction>>(path.resolve("src/lib/auth/actions.ts"), {
    "@/lib/prisma": { prisma: { user: {
      async findUnique() { return user; }, async create() { return user; },
    } } },
    "next/navigation": { redirect(url: string) { throw new Error(`Redirect:${url}`); } },
    "./password": { async hashPassword() { return "hash"; }, async verifyPassword() { return true; } },
    "./session": { async createSession() {}, async deleteSession() {} },
    "@/lib/rate-limit": { async limitAuthRequest() { return true; } },
    "./email": { isResetEmailConfigured() { return true; }, async sendPasswordResetEmail() {} },
    "./reset-password": { async completePasswordReset() { return true; } },
    ...overrides,
  });
}

function authForm(next?: string) {
  const form = new FormData();
  form.set("name", "Student A");
  form.set("email", "student@example.com");
  form.set("password", "Password123");
  if (next) form.set("next", next);
  return form;
}

test("simultaneous registration with the same email returns a field error", async () => {
  const actions = loadAuthActions({
    "@/lib/prisma": { prisma: { user: {
      async findUnique() { return null; },
      async create() {
        throw new Prisma.PrismaClientKnownRequestError("Duplicate email", { code: "P2002", clientVersion: "test" });
      },
    } } },
  });
  const result = await actions.register(undefined, authForm());
  assert.ok(result?.errors?.email?.length);
  assert.equal(result?.message, undefined);
});

test("login returns a friendly retry message if credentials change during session creation", async () => {
  const actions = loadAuthActions({
    "./session": {
      async createSession(userId: string, expectedVersion: number) {
        assert.equal(userId, currentUser);
        assert.equal(expectedVersion, 2);
        throw new Error("Account credentials have changed; please sign in again");
      },
      async deleteSession() {},
    },
  });
  const result = await actions.login(undefined, authForm());
  assert.ok(result?.message?.includes("Qaytadan urinib"));
  assert.equal(result?.message?.includes("Account credentials"), false);
});

test("login and registration database failures return user-facing errors without raw details", async () => {
  const actions = loadAuthActions({
    "@/lib/prisma": { prisma: { user: {
      async findUnique() { throw new Error("Database secret connection details"); },
    } } },
  });
  for (const action of [actions.login, actions.register]) {
    const result = await action(undefined, authForm());
    assert.ok(result?.message);
    assert.equal(result?.message?.includes("Database secret"), false);
  }
});

test("registration explains when the account exists but the session could not be created", async () => {
  const actions = loadAuthActions({
    "@/lib/prisma": { prisma: { user: {
      async findUnique() { return null; }, async create() { return { id: currentUser }; },
    } } },
    "./session": { async createSession() { throw new Error("Cookie write failed"); }, async deleteSession() {} },
  });
  const result = await actions.register(undefined, authForm());
  assert.ok(result?.message?.includes("Hisob yaratildi"));
});

test("successful auth redirects remain outside error handlers", async () => {
  const actions = loadAuthActions({
    "@/lib/prisma": { prisma: { user: {
      async findUnique() { return null; }, async create() { return { id: currentUser }; },
    } } },
  });
  await assert.rejects(actions.register(undefined, authForm()), /Redirect:\/dashboard/);
  const login = loadAuthActions();
  await assert.rejects(login.login(undefined, authForm("/tasks?q=math")), /Redirect:\/tasks\?q=math/);
});
