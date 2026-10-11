import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as schema from "../src/features/groups/schema";
import { ok, fail } from "../src/lib/types";

test("group validation normalizes codes and rejects unsafe material URLs", () => {
  assert.equal(schema.joinGroupSchema.parse(" abcdef0123456789 "), "ABCDEF0123456789");
  assert.equal(schema.joinGroupSchema.safeParse("invalid").success, false);
  for (const url of ["javascript:alert(1)", "data:text/html,test", "file:///tmp/test"]) {
    assert.equal(schema.groupPostSchema.safeParse({ groupId: "group", kind: "MATERIAL", title: "Notes", content: "Read", url }).success, false);
  }
});

test("nonmembers cannot publish; deletion is scoped to membership and author or owner", async () => {
  const filename = path.resolve("src/features/groups/actions.ts");
  const localRequire = createRequire(filename);
  const testModule = { exports: {} as Record<string, (...args: unknown[]) => Promise<{ success: boolean }>> };
  let writes = 0;
  let deletion: unknown;
  const deps: Record<string, unknown> = {
    "next/cache": { revalidatePath() {} },
    "@/lib/auth/dal": { async verifySession() { return { userId: "student" }; } },
    "@/lib/rate-limit": { async consumeRateLimit() { return { allowed: true }; } },
    "@/lib/types": { ok, fail },
    "./schema": schema,
    "@/lib/prisma": { prisma: {
      groupMember: { async findUnique() { return null; } },
      groupPost: {
        async create() { writes++; },
        async deleteMany(args: unknown) { deletion = args; return { count: 0 }; },
      },
    } },
  };
  runInNewContext(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { module: testModule, exports: testModule.exports, require: (id: string) => deps[id] ?? localRequire(id) });
  assert.equal((await testModule.exports.publishGroupPost({ groupId: "other-group", kind: "QUESTION", title: "Question", content: "Help" })).success, false);
  assert.equal(writes, 0);
  assert.equal((await testModule.exports.deleteGroupPost("other-post")).success, false);
  assert.deepEqual(JSON.parse(JSON.stringify(deletion)), { where: {
    id: "other-post", group: { members: { some: { userId: "student" } } },
    OR: [{ authorId: "student" }, { group: { ownerId: "student" } }],
  } });
});
