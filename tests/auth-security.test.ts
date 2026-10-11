import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { SignJWT } from "jose";
import * as tokenModule from "../src/lib/auth/token";
import { safeNextPath, hashResetToken } from "../src/lib/auth/security";
import { SignupSchema, LoginSchema, ResetPasswordSchema } from "../src/lib/auth/definitions";
import { readJsonBody } from "../src/lib/http";

process.env.SESSION_SECRET = "test-secret-at-least-32-bytes-123456789";

function loadModule<T>(relativePath: string, dependencies: Record<string, unknown>, globals = {}) {
  const filename = path.resolve(relativePath);
  const localRequire = createRequire(filename);
  const testModule = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  runInNewContext(outputText, {
    module: testModule,
    exports: testModule.exports,
    require: (id: string) => id === "server-only" ? {} : dependencies[id] ?? localRequire(id),
    console: { error() {} },
    process, fetch, AbortSignal, URL, TextEncoder, Date, ...globals,
  }, { filename });
  return testModule.exports as T;
}

test("redirects reject protocol-relative, backslash and login-loop targets", () => {
  for (const value of ["//evil.example", "/\\evil.example", "https://evil.example", " /tasks", "/\nevil", "/login", "/reset-password?token=secret", null]) {
    assert.equal(safeNextPath(value), "/dashboard");
  }
  assert.equal(safeNextPath("/tasks?status=PENDING&page=2"), "/tasks?status=PENDING&page=2");
});

test("sessions reject tampering, legacy claims and expiry", async () => {
  const payload = { userId: "student-a", sessionVersion: 2, expiresAt: new Date(Date.now() + 60_000).toISOString() };
  const token = await tokenModule.encrypt(payload);
  assert.deepEqual(await tokenModule.decrypt(token), payload);
  const parts = token.split(".");
  parts[1] = Buffer.from(JSON.stringify({ ...payload, userId: "student-b" })).toString("base64url");
  assert.equal(await tokenModule.decrypt(parts.join(".")), null);
  const legacy = await new SignJWT({ userId: "student-a", expiresAt: payload.expiresAt })
    .setProtectedHeader({ alg: "HS256" }).setIssuer("student-app").setAudience("student-app")
    .setExpirationTime("1m").sign(tokenModule.getSessionKey());
  assert.equal(await tokenModule.decrypt(legacy), null);
  const expired = await tokenModule.encrypt({ ...payload, expiresAt: new Date(Date.now() - 60_000).toISOString() });
  assert.equal(await tokenModule.decrypt(expired), null);
});

test("database session check rejects password-reset versions and deleted accounts", async () => {
  let user: { sessionVersion: number } | null = { sessionVersion: 3 };
  const session = loadModule<{ getAuthenticatedSession: (token: string) => Promise<unknown> }>("src/lib/auth/session.ts", {
    "./token": tokenModule,
    "next/headers": { cookies() { throw new Error("Unexpected cookie access"); } },
    "@/lib/prisma": { prisma: { user: { async findUnique() { return user; } } } },
  });
  const token = await tokenModule.encrypt({ userId: "student-a", sessionVersion: 3, expiresAt: new Date(Date.now() + 60_000).toISOString() });
  assert.ok(await session.getAuthenticatedSession(token));
  user = { sessionVersion: 4 };
  assert.equal(await session.getAuthenticatedSession(token), null);
  user = null;
  assert.equal(await session.getAuthenticatedSession(token), null);
});

test("password schemas normalize email, reject whitespace names and bcrypt-truncated passwords", () => {
  assert.equal(SignupSchema.safeParse({ name: "  ", email: "a@example.com", password: "password123" }).success, false);
  assert.equal(LoginSchema.parse({ email: " Student@Example.com ", password: "password123" }).email, "student@example.com");
  const tooLong = "€".repeat(24) + "a1";
  for (const schema of [SignupSchema, LoginSchema, ResetPasswordSchema]) {
    assert.equal(schema.safeParse({ name: "Student", email: "a@example.com", token: "a".repeat(64), password: tooLong }).success, false);
  }
  assert.equal(ResetPasswordSchema.safeParse({ token: "arbitrary-token", password: "password123" }).success, false);
});

test("password recovery never exposes reset credentials to the caller", async () => {
  let known = true;
  let configured = true;
  let allowed = true;
  const sent: { token: string }[] = [];
  const created: { tokenHash: string }[] = [];
  const actions = loadModule<{ forgotPassword: (state: undefined, data: FormData) => Promise<unknown> }>("src/lib/auth/actions.ts", {
    "@/lib/prisma": { prisma: {
      user: { async findUnique() { return known ? { id: "student-a" } : null; } },
      passwordResetToken: {
        async create({ data }: { data: { tokenHash: string } }) { created.push(data); return { id: "reset-id" }; },
      },
    } },
    "@/lib/rate-limit": { async limitAuthRequest() { return allowed; } },
    "./email": {
      isResetEmailConfigured: () => configured,
      async sendPasswordResetEmail(_email: string, token: string) { sent.push({ token }); },
    },
    "./security": { hashResetToken, safeNextPath },
    "./session": {}, "./password": {}, "./reset-password": {},
  });
  const form = new FormData();
  form.set("email", "student@example.com");
  const knownResponse = await actions.forgotPassword(undefined, form);
  assert.equal(sent.length, 1);
  assert.match(sent[0].token, /^[a-f0-9]{64}$/);
  assert.equal(created[0].tokenHash, hashResetToken(sent[0].token));
  assert.ok(!JSON.stringify(knownResponse).includes(sent[0].token));
  assert.ok(!JSON.stringify(knownResponse).includes("__debug"));
  known = false;
  assert.deepEqual(await actions.forgotPassword(undefined, form), knownResponse);
  assert.equal(sent.length, 1);
  configured = false;
  assert.ok(!JSON.stringify(await actions.forgotPassword(undefined, form)).includes('"success":true'));
  configured = true;
  allowed = false;
  assert.ok(!JSON.stringify(await actions.forgotPassword(undefined, form)).includes('"success":true'));
  assert.equal(sent.length, 1);
});

test("database outages fail closed with a service error rather than a false rate-limit message", async () => {
  let writes = 0;
  const actions = loadModule<{ login: (state: undefined, data: FormData) => Promise<{ message: string }> }>("src/lib/auth/actions.ts", {
    "@/lib/prisma": { prisma: { user: { async findUnique() { writes++; throw new Error("Unexpected database query"); } } } },
    "@/lib/rate-limit": { async limitAuthRequest() { throw new Error("Database is offline"); } },
    "./email": {}, "./security": { hashResetToken, safeNextPath },
    "./session": {}, "./password": {}, "./reset-password": {},
  });
  const form = new FormData();
  form.set("email", "student@example.com");
  form.set("password", "password123");
  const result = await actions.login(undefined, form);
  assert.ok(result.message.includes("ulanib bo'lmadi"));
  assert.ok(!result.message.includes("ko'p urinish"));
  assert.equal(writes, 0);
});

test("reset consumes once, invalidates sibling tokens and increments session version", async () => {
  const record = { id: "reset-id", tokenHash: hashResetToken("a".repeat(64)), userId: "student-a", usedAt: null as Date | null, expiresAt: new Date(Date.now() + 60_000) };
  let version = 0;
  let siblingsInvalidated = false;
  let queue: Promise<unknown> = Promise.resolve();
  const tx = {
    passwordResetToken: {
      async findUnique() { return { ...record }; },
      async updateMany({ where, data }: { where: { id?: string; userId?: string }; data: { usedAt: Date } }) {
        if (where.id) {
          if (record.usedAt) return { count: 0 };
          record.usedAt = data.usedAt;
          return { count: 1 };
        }
        siblingsInvalidated = where.userId === "student-a";
        return { count: 1 };
      },
    },
    user: { async update({ data }: { data: { passwordHash: string; sessionVersion: { increment: number } } }) {
      assert.equal(data.passwordHash, "new-password-hash");
      version += data.sessionVersion.increment;
    } },
  };
  const service = loadModule<{ completePasswordReset: (token: string, hash: string) => Promise<boolean> }>("src/lib/auth/reset-password.ts", {
    "./security": { hashResetToken },
    "@/lib/prisma": { prisma: { $transaction(callback: (client: typeof tx) => Promise<boolean>, options: { isolationLevel: string }) {
      assert.equal(options.isolationLevel, "Serializable");
      const result = queue.then(() => callback(tx));
      queue = result;
      return result;
    } } },
  });
  const results = await Promise.all([
    service.completePasswordReset("a".repeat(64), "new-password-hash"),
    service.completePasswordReset("a".repeat(64), "new-password-hash"),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(version, 1);
  assert.ok(siblingsInvalidated);
  assert.equal(await service.completePasswordReset("a".repeat(64), "new-password-hash"), false);
});

test("email delivery uses configured origin and never trusts a request hostname", async () => {
  const original = { RESEND_API_KEY: process.env.RESEND_API_KEY, EMAIL_FROM: process.env.EMAIL_FROM, APP_URL: process.env.APP_URL };
  process.env.RESEND_API_KEY = "test-email-api-key";
  process.env.EMAIL_FROM = "Student App <noreply@example.com>";
  process.env.APP_URL = "https://student.example.com";
  const deliveries: { url: string; body: { text: string; to: string[] }; headers: Record<string, string> }[] = [];
  try {
    const email = loadModule<{ sendPasswordResetEmail: (email: string, token: string, id: string) => Promise<void> }>("src/lib/auth/email.ts", {}, {
      async fetch(url: string, options: { body: string; headers: Record<string, string> }) {
        deliveries.push({ url, body: JSON.parse(options.body), headers: options.headers });
        return { ok: true };
      },
    });
    await email.sendPasswordResetEmail("student@example.com", "a".repeat(64), "reset-id");
    assert.equal(deliveries[0].url, "https://api.resend.com/emails");
    assert.ok(deliveries[0].body.text.includes("https://student.example.com/reset-password?token="));
    assert.equal(deliveries[0].headers["Idempotency-Key"], "password-reset/reset-id");
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("JSON input is bounded even when Content-Length is absent", async () => {
  const request = (body: string, type = "application/json") => new Request("https://student.example.com/api/ai/chat", { method: "POST", body, headers: { "Content-Type": type } });
  assert.deepEqual(await readJsonBody(request('{"message":"salom"}')), { message: "salom" });
  await assert.rejects(readJsonBody(request("invalid")), { status: 400 });
  await assert.rejects(readJsonBody(request("{}", "text/plain")), { status: 415 });
  await assert.rejects(readJsonBody(request(JSON.stringify({ message: "x".repeat(33_000) }))), { status: 413 });
});

test("rate limiter denies exhausted counters and hashes identifiers before storage", async () => {
  let count = 0;
  const keys: unknown[] = [];
  const rateLimit = loadModule<{ consumeRateLimit: (scope: string, id: string, limit: number, window: number) => Promise<{ allowed: boolean }> }>("src/lib/rate-limit.ts", {
    "next/headers": {},
    "@/lib/prisma": { prisma: { async $queryRaw(sql: TemplateStringsArray, ...values: unknown[]) {
      assert.ok(sql.join("").includes('ON CONFLICT ("key") DO UPDATE'));
      keys.push(values[0]);
      return [{ count: ++count, resetsAt: new Date(Date.now() + 60_000) }];
    } } },
  });
  const results = await Promise.all(Array.from({ length: 5 }, () => rateLimit.consumeRateLimit("login", "student@example.com", 3, 60_000)));
  assert.equal(results.filter((result) => result.allowed).length, 3);
  assert.ok(keys.every((key) => typeof key === "string" && !key.includes("student@example.com")));
  await assert.rejects(rateLimit.consumeRateLimit("login", "a", 0, 60_000));
});
