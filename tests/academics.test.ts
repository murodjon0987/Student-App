import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as imageModule from "../src/lib/image";
import * as dates from "../src/lib/date";
import { fail, ok } from "../src/lib/types";
import { taskSchema } from "../src/features/tasks/schema";
import { eventSchema } from "../src/features/calendar/schema";
import { attendanceSchema } from "../src/features/attendance/schema";

const encoder = new TextEncoder();
const bytes = (value: string) => encoder.encode(value);
const pdfBytes = bytes("%PDF-1.7\n% some pdf body");
const docxBytes = (() => {
  const head = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
  return new Uint8Array([...head, ...bytes("word/document.xml")]);
})();
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);

function loadModule<T>(relativePath: string, dependencies: Record<string, unknown>): T {
  const filename = path.resolve(relativePath);
  const localRequire = createRequire(filename);
  const testModule = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  runInNewContext(outputText, {
    module: testModule,
    exports: testModule.exports,
    require: (id: string) => (id in dependencies ? dependencies[id] : localRequire(id)),
    File, FormData, Response, Uint8Array, ArrayBuffer, Date, URL, TextEncoder, console, process,
  }, { filename });
  return testModule.exports as T;
}

const fileType = loadModule<{
  detectAttachmentMime(data: Uint8Array): string | null;
  sanitizeFileName(name: string): string;
  attachmentKindLabel(mime: string): string;
}>("src/features/attachments/file-type.ts", { "@/lib/image": imageModule });

test("attachment type detection trusts bytes and rejects unsafe files", () => {
  assert.equal(fileType.detectAttachmentMime(pdfBytes), "application/pdf");
  assert.equal(fileType.detectAttachmentMime(docxBytes), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.equal(fileType.detectAttachmentMime(jpeg), "image/jpeg");
  for (const bad of [
    bytes("<svg onload='alert(1)'/>"),
    bytes("<html><script>alert(1)</script>"),
    bytes("just plain text"),
    new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]),
  ]) {
    assert.equal(fileType.detectAttachmentMime(bad), null);
  }
});

test("attachment file names cannot break headers or escape the directory", () => {
  assert.equal(fileType.sanitizeFileName("../../etc/passwd"), "_.._etc_passwd");
  assert.equal(fileType.sanitizeFileName("a\r\nContent-Type: text/html"), "a__Content-Type: text_html");
  assert.equal(fileType.sanitizeFileName(""), "fayl");
  assert.equal(fileType.attachmentKindLabel("application/pdf"), "PDF");
});

type UploadResult = { success: boolean; error?: string; data?: { id: string } };
type UploadActions = { uploadAttachment(form: FormData): Promise<UploadResult> };

function uploadForm(fileBytes: Uint8Array, name = "doc.pdf", parent: Record<string, string> = { homeworkId: "hw-1" }) {
  const form = new FormData();
  form.set("file", new File([fileBytes as unknown as BlobPart], name, { type: "application/pdf" }));
  for (const [key, value] of Object.entries(parent)) form.set(key, value);
  return form;
}

function loadUpload(db: unknown) {
  return loadModule<UploadActions>("src/features/attachments/actions.ts", {
    "next/cache": { revalidatePath() {} },
    "@/lib/prisma": { prisma: db },
    "@/lib/auth/dal": { async verifySession() { return { userId: "student-a" }; } },
    "@/lib/types": { fail, ok },
    "./file-type": fileType,
  });
}

test("attachment upload rejects invalid types, sizes and parents before writing", async () => {
  let created = 0;
  const actions = loadUpload({
    attachment: { async create() { created++; return { id: "x" }; } },
    homework: { async findFirst() { return { id: "hw-1" }; } },
  });
  assert.equal((await actions.uploadAttachment(uploadForm(bytes("<svg/>"), "evil.pdf"))).success, false);
  assert.equal((await actions.uploadAttachment(uploadForm(new Uint8Array(8_000_001)))).success, false);
  assert.equal((await actions.uploadAttachment(uploadForm(pdfBytes, "doc.pdf", {}))).success, false);
  assert.equal((await actions.uploadAttachment(uploadForm(pdfBytes, "doc.pdf", { homeworkId: "h", noteId: "n" }))).success, false);
  assert.equal(created, 0);
});

test("attachment upload refuses foreign parents and caps per-item files", async () => {
  const foreign = loadUpload({ homework: { async findFirst() { return null; } } });
  assert.equal((await foreign.uploadAttachment(uploadForm(pdfBytes))).success, false);

  let inserted: { data: { mimeType: string; userId: string; homeworkId: string } } | undefined;
  const owner = loadUpload({
    homework: { async findFirst() { return { id: "hw-1" }; } },
    attachment: {
      async count() { return 20; },
      async create({ data }: { data: { mimeType: string; userId: string; homeworkId: string } }) { inserted = { data }; return { id: "att-1" }; },
    },
  });
  assert.equal((await owner.uploadAttachment(uploadForm(pdfBytes))).success, false);
  assert.equal(inserted, undefined);
});

test("attachment upload stores verified bytes for the owner", async () => {
  const inserted: { data?: { mimeType: string; size: number; userId: string; homeworkId: string; name: string } } = {};
  const actions = loadUpload({
    homework: { async findFirst() { return { id: "hw-1" }; } },
    attachment: {
      async count() { return 2; },
      async create({ data }: { data: NonNullable<typeof inserted.data> }) { inserted.data = data; return { id: "att-1" }; },
    },
  });
  const result = await actions.uploadAttachment(uploadForm(pdfBytes, "lecture.pdf"));
  assert.equal(result.success, true);
  assert.equal(inserted.data?.mimeType, "application/pdf");
  assert.equal(inserted.data?.userId, "student-a");
  assert.equal(inserted.data?.homeworkId, "hw-1");
  assert.equal(inserted.data?.name, "lecture.pdf");
  assert.equal(inserted.data?.size, pdfBytes.length);
});

type ReminderActions = { deliverDeadlineReminders(now: Date): Promise<{ created: number }> };

function loadReminders(db: unknown) {
  return loadModule<ReminderActions>("src/features/student-tools/reminders.ts", {
    "server-only": {},
    "@prisma/client": { Prisma: { PrismaClientKnownRequestError: class extends Error { code = ""; }, TransactionIsolationLevel: { Serializable: "Serializable" } } },
    "@/lib/prisma": { prisma: db },
    "@/features/notifications/push": { async sendPushToUser() {} },
    "@/features/notifications/preferences": { notificationRecipientsWhere: { OR: [] } },
  });
}

test("deadline reminders fire at 24h and 1h once and skip completed work", async () => {
  const now = new Date("2026-10-11T08:00:00.000Z");
  const keys = new Set<string>();
  let taskCalls = 0;
  let homeworkCalls = 0;
  const taskWindows = [
    [{ id: "t1", title: "Essay", deadline: new Date(now.getTime() + 30 * 60_000), userId: "u1" }],
    [],
  ];
  const homeworkWindows = [
    [],
    [{ id: "h1", title: "Lab", deadline: new Date(now.getTime() + 20 * 3_600_000), userId: "u2" }],
  ];
  const db = {
    exam: { async findMany() { return []; } },
    task: { async findMany() { return taskWindows[taskCalls++] ?? []; } },
    homework: { async findMany() { return homeworkWindows[homeworkCalls++] ?? []; } },
    async $transaction(fn: (tx: unknown) => unknown) {
      return fn({
        toolReminder: {
          async findUnique({ where }: { where: { userId_key: { key: string } } }) { return keys.has(where.userId_key.key) ? {} : null; },
          async create({ data }: { data: { key: string } }) { keys.add(data.key); },
        },
        notification: { async create() {} },
      });
    },
  };
  const actions = loadReminders(db);
  assert.equal((await actions.deliverDeadlineReminders(now)).created, 2);
  taskCalls = 0;
  homeworkCalls = 0;
  assert.equal((await actions.deliverDeadlineReminders(now)).created, 0);
  assert.deepEqual([...keys].sort(), ["homework:h1:24h", "task:t1:1h"]);
});

type PushModule = {
  isValidPushEndpoint(value: unknown): boolean;
  validatePushSubscription(value: unknown): unknown;
  savePushSubscription(userId: string, subscription: unknown): Promise<{ success: boolean; error?: string }>;
};

function loadPush(db: unknown) {
  return loadModule<PushModule>("src/features/notifications/push.ts", {
    "server-only": {},
    "web-push": { setVapidDetails() {}, async sendNotification() {} },
    "@/lib/prisma": { prisma: db },
    "@/lib/types": { fail, ok },
    "./preferences": { notificationRecipientsWhere: { OR: [] } },
  });
}

test("push subscriptions require HTTPS endpoints, valid keys and respect the device cap", async () => {
  const previous = [process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY];
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public";
  process.env.VAPID_PRIVATE_KEY = "private";
  try {
    const valid = { endpoint: "https://push.example.com/abc", keys: { p256dh: "A".repeat(87), auth: "B".repeat(22) } };
    let upserts = 0;
    const db = {
      pushSubscription: {
        async findUnique() { return null; },
        async count() { return 5; },
        async upsert() { upserts++; },
      },
    };
    const push = loadPush(db);
    assert.equal(push.isValidPushEndpoint("http://push.example.com"), false);
    assert.equal(push.isValidPushEndpoint("javascript:alert(1)"), false);
    assert.equal(push.validatePushSubscription({ ...valid, keys: { p256dh: "short", auth: "B".repeat(22) } }), null);
    assert.equal((await push.savePushSubscription("u1", { ...valid, endpoint: "http://insecure" })).success, false);
    assert.equal((await push.savePushSubscription("u1", valid)).success, true);
    assert.equal(upserts, 1);

    const full = loadPush({ pushSubscription: { async findUnique() { return null; }, async count() { return 20; }, async upsert() { upserts++; } } });
    const result = await full.savePushSubscription("u1", valid);
    assert.equal(result.success, false);
  } finally {
    for (const [index, key] of ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"].entries()) {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    }
  }
});

test("trim-first validation rejects blank and oversized task titles", () => {
  assert.equal(taskSchema.safeParse({ title: "   ", priority: "LOW", status: "PENDING" }).success, false);
  assert.equal(taskSchema.safeParse({ title: "x".repeat(201), priority: "LOW", status: "PENDING" }).success, false);
  const okParse = taskSchema.safeParse({ title: "  Valid task  ", priority: "LOW", status: "PENDING" });
  assert.equal(okParse.success, true);
  assert.equal(okParse.success ? okParse.data.title : "", "Valid task");
  assert.equal(eventSchema.safeParse({ title: "x", type: "PERSONAL", start: "2026-01-01T10:00", allDay: false, color: "#fff" }).success, true);
});

type EventActions = { saveEvent(input: unknown): Promise<{ success: boolean; error?: string }> };

test("calendar events reject an end time before the start time", async () => {
  let writes = 0;
  const actions = loadModule<EventActions>("src/features/calendar/actions.ts", {
    "next/cache": { revalidatePath() {} },
    "@/lib/prisma": { prisma: { event: { async findFirst() { return { id: "e1" }; }, async update() { writes++; }, async create() { writes++; } } } },
    "@/lib/auth/dal": { async verifySession() { return { userId: "u1" }; } },
    "@/lib/types": { fail, ok },
    "@/lib/date": dates,
    "./schema": { eventSchema },
  });
  const reversed = await actions.saveEvent({ title: "Test", type: "PERSONAL", start: "2026-01-01T10:00", end: "2026-01-01T09:00", allDay: false, color: "#fff" });
  assert.equal(reversed.success, false);
  assert.match(reversed.error ?? "", /oldin/);
  assert.equal(writes, 0);
});

type AttendanceActions = { saveAttendance(input: unknown): Promise<{ success: boolean; data?: { id: string } }> };

test("attendance duplicate for the same day is updated instead of duplicated", async () => {
  let updated: { id: string } | undefined;
  const actions = loadModule<AttendanceActions>("src/features/attendance/actions.ts", {
    "next/cache": { revalidatePath() {} },
    "@/lib/prisma": { prisma: {
      schedule: { async findFirst() { return { id: "s1" }; } },
      attendance: {
        async findFirst() { return { id: "dup" }; },
        async update({ where }: { where: { id: string } }) { updated = where; return { id: "dup" }; },
        async create() { throw new Error("should not create"); },
      },
    } },
    "@/lib/ownership": { async ownsSubject() { return true; } },
    "@/lib/auth/dal": { async verifySession() { return { userId: "u1" }; } },
    "@/lib/types": { fail, ok },
    "@/lib/date": dates,
    "./schema": { attendanceSchema },
  });
  const result = await actions.saveAttendance({ subjectId: "sub1", scheduleId: "s1", date: "2026-10-11", status: "PRESENT", note: "" });
  assert.equal(result.success, true);
  assert.deepEqual(JSON.parse(JSON.stringify(updated)), { id: "dup" });
});
