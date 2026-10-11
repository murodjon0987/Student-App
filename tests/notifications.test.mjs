import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { Prisma } from "@prisma/client";

async function loadModule(path, imports, globals = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, {
    module: compiledModule, exports: compiledModule.exports, process,
    require(name) {
      if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
      return imports[name];
    },
    ...globals,
  });
  return compiledModule.exports;
}

const preferences = await loadModule("../src/features/notifications/preferences.ts", {});
const dailyMessages = await loadModule("../src/features/notifications/daily-messages.ts", {});
const clone = (value) => JSON.parse(JSON.stringify(value));
const enabled = (user, filter) => filter.OR.some((option) =>
  option.profile.is === null ? user.profile === null : user.profile?.notificationsEnabled === option.profile.is.notificationsEnabled
);

test("all push entry points enforce saved preferences, including profile defaults", async () => {
  const recipients = [
    { id: "on", profile: { notificationsEnabled: true } },
    { id: "off", profile: { notificationsEnabled: false } },
    { id: "default", profile: null },
  ];
  const sent = [];
  const queries = [];
  const previous = [process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY];
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public";
  process.env.VAPID_PRIVATE_KEY = "test-private";
  try {
    const push = await loadModule("../src/features/notifications/push.ts", {
      "server-only": {},
      "web-push": { setVapidDetails() {}, async sendNotification(subscription) { sent.push(subscription.endpoint); } },
      "@/lib/prisma": { prisma: { pushSubscription: {
        async findMany(query) {
          queries.push(query);
          const filter = query.where.user.is;
          return recipients
            .filter((user) => enabled(user, filter) && (!filter.id || filter.id.in.includes(user.id)))
            .map((user) => ({ id: user.id, endpoint: user.id, p256dh: "key", auth: "auth" }));
        },
      } } },
      "@/lib/types": { ok() {}, fail() {} },
      "./preferences": preferences,
    });
    assert.equal((await push.sendPushToAll({ title: "test", body: "test" })).sent, 2);
    assert.deepEqual(sent, ["on", "default"]);
    sent.length = 0;
    assert.equal((await push.sendPushToUser("off", { title: "test", body: "test" })).sent, 0);
    assert.deepEqual(sent, []);
    const queryCount = queries.length;
    assert.equal((await push.sendPushToUsers([], { title: "test", body: "test" })).sent, 0);
    assert.equal(queries.length, queryCount);
  } finally {
    for (const [index, key] of ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"].entries()) {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    }
  }
});

async function cronHarness({ conflict = false } = {}) {
  const users = [
    { id: "a", profile: { notificationsEnabled: true } },
    { id: "b", profile: { notificationsEnabled: false } },
    { id: "c", profile: null },
  ];
  const records = [];
  const sent = [];
  const queries = [];
  const rateLimits = [
    { key: "expired", resetsAt: new Date("2026-10-10T21:59:59.000Z") },
    { key: "current", resetsAt: new Date("2026-10-10T22:01:00.000Z") },
  ];
  let cleanupCalls = 0;
  let transactions = 0;
  let inTransaction = false;
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ["2026-10-10T22:00:00.000Z"])); }
  }
  const route = await loadModule("../src/app/api/cron/daily/route.ts", {
    "next/server": { NextResponse: { json(data, options) { return { data: clone(data), status: options?.status ?? 200 }; } } },
    "@prisma/client": { Prisma },
    "@/lib/prisma": { prisma: {
      requestRateLimit: { async deleteMany({ where }) {
        cleanupCalls += 1;
        for (let index = rateLimits.length - 1; index >= 0; index -= 1) {
          if (rateLimits[index].resetsAt <= where.resetsAt.lte) rateLimits.splice(index, 1);
        }
      } },
      async $transaction(callback, options) {
        transactions += 1;
        assert.equal(options.isolationLevel, Prisma.TransactionIsolationLevel.Serializable);
        if (conflict && transactions === 1) {
          throw new Prisma.PrismaClientKnownRequestError("retry", { code: "P2034", clientVersion: "test" });
        }
        inTransaction = true;
        const result = await callback({
          user: { async findMany(query) {
            queries.push(query);
            const filter = query.where;
            const duplicate = filter.notifications.none;
            return users.filter((user) =>
              enabled(user, filter) && (!filter.id || user.id > filter.id.gt) && !records.some((record) =>
                record.userId === user.id && record.title === duplicate.title && record.message === duplicate.message &&
                record.type === duplicate.type && record.createdAt >= duplicate.createdAt.gte && record.createdAt < duplicate.createdAt.lt
              )
            ).slice(0, query.take).map((user) => ({ id: user.id }));
          } },
          notification: { async createMany({ data }) { records.push(...data); } },
        });
        inTransaction = false;
        return result;
      },
    } },
    "@/features/notifications/push": { async sendPushToUsers(ids) {
      assert.equal(inTransaction, false, "network delivery starts after the transaction commits");
      assert.ok(ids.every((id) => records.some((record) => record.userId === id)));
      sent.push(...ids);
      return { sent: ids.length, removed: 0 };
    } },
    "@/features/notifications/daily-messages": dailyMessages,
    "@/features/notifications/preferences": preferences,
  }, { Date: FixedDate });
  return { route, records, sent, queries, rateLimits, get cleanupCalls() { return cleanupCalls; }, get transactions() { return transactions; } };
}

async function withCronSecret(run) {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-secret";
  try { await run(); } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
}

test("daily cron skips disabled accounts and repeated runs do not duplicate notifications or push", async () => {
  await withCronSecret(async () => {
    const app = await cronHarness();
    const request = new Request("https://student.example/api/cron/daily", { headers: { authorization: "Bearer test-secret" } });
    const first = await app.route.GET(request);
    assert.equal(first.status, 200);
    assert.equal(first.data.users, 2);
    assert.equal(app.cleanupCalls, 1);
    assert.deepEqual(app.rateLimits.map((limit) => limit.key), ["current"]);
    assert.deepEqual(app.sent, ["a", "c"]);
    assert.equal(app.records.length, 2);
    const second = await app.route.GET(request);
    assert.equal(second.data.users, 0);
    assert.equal(second.data.sent, 0);
    assert.equal(app.records.length, 2);
    assert.deepEqual(app.sent, ["a", "c"]);
    const range = app.queries[0].where.notifications.none.createdAt;
    assert.equal(range.gte.toISOString(), "2026-10-10T19:00:00.000Z");
    assert.equal(range.lt.toISOString(), "2026-10-11T19:00:00.000Z");
  });
});

test("daily cron retries serialization conflicts without sending duplicate push", async () => {
  await withCronSecret(async () => {
    const app = await cronHarness({ conflict: true });
    const response = await app.route.GET(new Request("https://student.example/api/cron/daily", { headers: { authorization: "Bearer test-secret" } }));
    assert.equal(response.status, 200);
    assert.equal(app.transactions, 2);
    assert.deepEqual(app.sent, ["a", "c"]);
    assert.equal(app.records.length, 2);
  });
});

test("daily cron rejects missing credentials without touching the database", async () => {
  await withCronSecret(async () => {
    const app = await cronHarness();
    const response = await app.route.GET(new Request("https://student.example/api/cron/daily"));
    assert.equal(response.status, 401);
    assert.equal(app.transactions, 0);
    assert.equal(app.cleanupCalls, 0);
    assert.equal(app.rateLimits.length, 2);
    assert.deepEqual(app.sent, []);
  });
});
