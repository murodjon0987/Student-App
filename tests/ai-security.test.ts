import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { detectRasterImageMime } from "../src/lib/image";
import * as http from "../src/lib/http";
import * as schema from "../src/features/ai/schema";
import { redactProviderTokens } from "../src/features/ai/content";

function loadModule<T>(relativePath: string, dependencies: Record<string, unknown>, globals = {}) {
  const filename = path.resolve(relativePath);
  const localRequire = createRequire(filename);
  const testModule = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  runInNewContext(outputText, {
    module: testModule, exports: testModule.exports,
    require: (id: string) => id === "server-only" ? {} : dependencies[id] ?? localRequire(id),
    console: { error() {} }, process, fetch, AbortSignal, AbortController, URL, URLSearchParams,
    TextEncoder, TextDecoder, Uint8Array, Buffer, Date, ReadableStream, Response,
    ...globals,
  }, { filename });
  return testModule.exports as T;
}

test("Pollinations credentials stay server-side and downloaded bytes use a private URL", async () => {
  const original = { AI_IMAGE_PROVIDER: process.env.AI_IMAGE_PROVIDER, GEMINI_API_KEY: process.env.GEMINI_API_KEY, POLLINATIONS_TOKEN: process.env.POLLINATIONS_TOKEN, AI_IMAGE_DISABLED: process.env.AI_IMAGE_DISABLED };
  process.env.AI_IMAGE_PROVIDER = "pollinations";
  delete process.env.GEMINI_API_KEY;
  process.env.POLLINATIONS_TOKEN = "private-provider-test-token";
  delete process.env.AI_IMAGE_DISABLED;
  const downloads: string[] = [];
  const stored: { userId: string; provider: string; data: Uint8Array; mimeType: string }[] = [];
  const png = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aR1sAAAAASUVORK5CYII=", "base64"));
  try {
    const image = loadModule<{ generateImage: (userId: string, prompt: string, signal?: AbortSignal) => Promise<{ url: string }> }>("src/features/ai/image.ts", {
      "@/lib/prisma": { prisma: { generatedImage: { async create({ data }: { data: typeof stored[number] }) {
        stored.push(data); return { id: "image-id" };
      } } } },
      "@/lib/http": http,
      "@/lib/image": { detectRasterImageMime },
    }, {
      async fetch(url: string) {
        downloads.push(url);
        return new Response(png, { headers: { "Content-Type": "image/png" } });
      },
    });
    const result = await image.generateImage("student-a", "cat drawing");
    assert.equal(result.url, "/api/ai/image/image-id");
    assert.ok(!JSON.stringify(result).includes("private-provider-test-token"));
    assert.ok(downloads[0].includes("private-provider-test-token"));
    assert.equal(stored[0].provider, "pollinations");
    assert.equal(stored[0].userId, "student-a");
    assert.deepEqual(stored[0].data, png);
    const abort = new AbortController();
    abort.abort(new DOMException("Timed out", "TimeoutError"));
    await assert.rejects(image.generateImage("student-a", "cat drawing", abort.signal), { name: "TimeoutError" });
    assert.equal(downloads.length, 1);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("old stored provider links are redacted without exposing credentials", () => {
  const content = "![cat](https://image.pollinations.ai/prompt/cat?token=old-secret&seed=123&key=other-secret)";
  const redacted = redactProviderTokens(content);
  assert.ok(!redacted.includes("old-secret"));
  assert.ok(!redacted.includes("other-secret"));
  assert.ok(redacted.includes("seed=123"));
  assert.equal(redactProviderTokens("![cat](/api/ai/image/id)"), "![cat](/api/ai/image/id)");
});

test("AI rejects revoked sessions, exhausted limits and disabled providers before DB writes", async () => {
  let session: { userId: string } | null = null;
  let allowed = true;
  let configured = true;
  let writes = 0;
  const route = loadModule<{ POST: (request: Request) => Promise<Response> }>("src/app/api/ai/chat/route.ts", {
    "@/lib/auth/session": { async getAuthenticatedSession() { return session; } },
    "@/lib/rate-limit": { async consumeRateLimit() { return { allowed, retryAfter: 60 }; } },
    "@/lib/http": http,
    "@/features/ai/schema": schema,
    "@/features/ai/content": { redactProviderTokens },
    "@/features/ai/context": {},
    "@/features/ai/gemini": { isAiConfigured: () => configured },
    "@/features/ai/image": { isImageRequest: () => false, isImageGenerationConfigured: () => configured },
    "@/lib/prisma": { prisma: { chat: { async create() { writes++; throw new Error("Unexpected write"); } } } },
  });
  const request = () => new Request("https://student.example.com/api/ai/chat", {
    method: "POST", body: JSON.stringify({ message: "salom" }), headers: { "Content-Type": "application/json" },
  });
  assert.equal((await route.POST(request())).status, 401);
  session = { userId: "student-a" };
  allowed = false;
  const limited = await route.POST(request());
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
  allowed = true;
  configured = false;
  assert.equal((await route.POST(request())).status, 503);
  assert.equal(writes, 0);
});

test("Gemini preserves the last SSE event without a trailing newline", async () => {
  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-gemini-key";
  let calls = 0;
  try {
    const gemini = loadModule<{ streamGemini: (input: { system: string; messages: []; signal?: AbortSignal }) => AsyncGenerator<string> }>("src/features/ai/gemini.ts", {}, {
      async fetch() {
        calls++;
        return new Response('data: {"candidates":[{"content":{"parts":[{"text":"Salom"}]}}]}');
      },
    });
    const chunks: string[] = [];
    for await (const chunk of gemini.streamGemini({ system: "test", messages: [] })) chunks.push(chunk);
    assert.deepEqual(chunks, ["Salom"]);
    const abort = new AbortController();
    abort.abort(new DOMException("Timed out", "TimeoutError"));
    await assert.rejects(gemini.streamGemini({ system: "test", messages: [], signal: abort.signal }).next(), { name: "TimeoutError" });
    assert.equal(calls, 1);
  } finally {
    if (original === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = original;
  }
});
