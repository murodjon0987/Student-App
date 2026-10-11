import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { Prisma } from "@prisma/client";

import { PAGE_SIZE, pageNumber, pagination, pageHref, param, queryPage } from "../src/lib/pagination";
import { todoWhere, noteWhere, materialWhere, literalSearch, gradeSummary } from "../src/lib/list-query";
import { materialSchema } from "../src/features/materials/schema";
import { settingsSchema } from "../src/features/settings/schema";
import { gradeSchema } from "../src/features/gpa/schema";
import { expenseSchema, budgetSchema } from "../src/features/budget/schema";

test("pagination accepts only safe positive integer pages and clamps after deletion", async () => {
  for (const value of [undefined, null, "", "0", "-1", "1.5", "1e4", "abc", ["2"], "9007199254740992"]) {
    assert.equal(pageNumber(value), 1);
  }
  assert.equal(pageNumber("3"), 3);
  assert.equal(pagination(49, "999").page, 3);
  assert.equal(pagination(0, "4").skip, 0);
  let requested: unknown;
  const result = await queryPage("999", async () => 25, async (range) => { requested = range; return ["last item"]; });
  assert.deepEqual(requested, { skip: PAGE_SIZE, take: PAGE_SIZE });
  assert.equal(result.pagination.page, 2);
  assert.deepEqual(result.items, ["last item"]);
});

test("page links preserve query filters and all selected amenities", () => {
  const href = pageHref("/housing", { q: "100% uy", amenity: ["WIFI", "AC"], page: "9", city: "Toshkent" }, 2);
  const url = new URL(href, "https://student.test");
  assert.equal(url.searchParams.get("q"), "100% uy");
  assert.deepEqual(url.searchParams.getAll("amenity"), ["WIFI", "AC"]);
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(pageHref("/tasks", {}, 1), "/tasks");
  assert.equal(param({ q: ["unexpected"] }, "q"), "");
  assert.equal(param({ q: "x".repeat(500) }, "q").length, 200);
});

test("global query filters retain ownership and literal text search", () => {
  assert.deepEqual(todoWhere("owner", { status: "COMPLETED", priority: "HIGH", q: "  50%_\\  " }), {
    userId: "owner", status: "COMPLETED", priority: "HIGH", title: { contains: "50\\%\\_\\\\", mode: "insensitive" },
  });
  assert.deepEqual(todoWhere("owner", { status: "INVALID", priority: "DROP TABLE" }), { userId: "owner" });
  assert.equal(noteWhere("owner", { tag: "math", q: "notes" }).userId, "owner");
  assert.deepEqual(noteWhere("owner", { tag: "math" }).tags, { has: "math" });
  assert.equal(materialWhere("owner", { category: "PHYSICS" }).category, "PHYSICS");
  assert.equal(materialWhere("owner", { category: "INVALID" }).category, undefined);
  assert.equal(literalSearch("%_\\"), "\\%\\_\\\\");
});

function loadModule<T>(filename: string, dependencies: Record<string, unknown>): T {
  const localRequire = createRequire(filename);
  const testModule = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  runInNewContext(outputText, {
    exports: testModule.exports,
    module: testModule,
    require: (id: string) => id in dependencies ? dependencies[id] : localRequire(id),
  }, { filename });
  return testModule.exports as T;
}

for (const [feature, model, fn] of [["tasks", "task", "getTasks"], ["homework", "homework", "getHomework"]]) {
  test(`${feature} paginates matching results globally and searches %/_ literally in both sorts`, async () => {
    const records = Array.from({ length: 80 }, (_, i) => ({ id: String(i), userId: i < 70 ? "owner" : "foreign", title: i < 40 ? `100% done ${i}` : `under_score ${i}` }));
    for (const q of ["%", "_"]) {
      const matching = (query: string) => records.filter((row) => row.userId === "owner" && row.title.includes(query));
      const prisma = {
        [model]: {
          async count({ where }: { where: ReturnType<typeof todoWhere> }) {
            assert.equal(where.userId, "owner");
            const value = where.title?.contains.replace(/\\([\\%_])/g, "$1") ?? "";
            assert.equal(value, q);
            return matching(value).length;
          },
          async findMany({ where, skip, take }: { where: ReturnType<typeof todoWhere>; skip: number; take: number }) {
            const value = where.title?.contains.replace(/\\([\\%_])/g, "$1") ?? "";
            return matching(value).slice(skip, skip + take);
          },
        },
        async $queryRaw(query: Prisma.Sql) {
          assert.match(query.sql, /POSITION\(LOWER\(/);
          assert.equal(query.values[0], "owner");
          assert.equal(query.values[1], q);
          const skip = Number(query.values.at(-2));
          const take = Number(query.values.at(-1));
          assert.equal(take, PAGE_SIZE);
          return matching(String(query.values[1])).slice(skip, skip + take);
        },
      };
      const exports = loadModule<Record<string, (params: Record<string, string>) => Promise<{ items: typeof records; pagination: ReturnType<typeof pagination> }>>>(path.resolve(`src/features/${feature}/queries.ts`), {
        "server-only": {}, "@prisma/client": { Prisma }, "@/lib/prisma": { prisma }, "@/lib/auth/dal": { verifySession: async () => ({ userId: "owner" }) },
        "@/lib/pagination": { param, queryPage }, "@/lib/list-query": { todoWhere },
      });
      for (const sort of ["created", "priority"]) {
        const result = await exports[fn]({ q, sort, page: "2" });
        assert.equal(result.pagination.total, matching(q).length);
        assert.deepEqual(result.items.map((item) => item.id), matching(q).slice(PAGE_SIZE, PAGE_SIZE * 2).map((item) => item.id));
      }
    }
  });
}

test("materials accept only valid absolute HTTP(S) URLs", () => {
  const material = { title: "Book", category: "OTHER" };
  for (const url of ["https://example.com/path?q=1", "http://localhost:3000", "HTTPS://example.com", "", null, undefined]) {
    assert.equal(materialSchema.safeParse({ ...material, url }).success, true, String(url));
  }
  for (const url of ["httpjunk", "httpx://example.com", "https:/example.com", "https://", "javascript:alert(1)", "ftp://example.com", "/local-path"]) {
    assert.equal(materialSchema.safeParse({ ...material, url }).success, false, url);
  }
});

test("language settings advertise and accept the implemented Uzbek interface only", () => {
  const settings = { language: "uz", theme: "system", notificationsEnabled: true, monthlyBudget: 0 };
  assert.equal(settingsSchema.safeParse(settings).success, true);
  for (const language of ["en", "ru", "other"]) assert.equal(settingsSchema.safeParse({ ...settings, language }).success, false);
});

test("GPA uses complete aggregate groups regardless of page size", () => {
  assert.deepEqual(gradeSummary([
    { grade: "5.0", _sum: { credit: 60 }, _count: { _all: 20 } },
    { grade: "3.0", _sum: { credit: 10 }, _count: { _all: 5 } },
  ]), { totalCredits: 70, gpa: 4.71, average: 4.6 });
  assert.deepEqual(gradeSummary([]), { totalCredits: 0, gpa: 0, average: 0 });
  assert.equal(gradeSchema.safeParse({ subjectName: "Math", credit: 3, grade: "Infinity" }).success, false);
  assert.equal(gradeSchema.safeParse({ subjectName: "  ", credit: 3, grade: "5.0" }).success, false);
});

test("budget input rejects rolled-over months and invalid calendar dates", () => {
  for (const month of ["2026-00", "2026-13", "2026-99"]) assert.equal(budgetSchema.safeParse({ month, amount: 1 }).success, false);
  const expense = { amount: 1, category: "FOOD" };
  assert.equal(expenseSchema.safeParse({ ...expense, date: "2024-02-29" }).success, true);
  for (const date of ["2026-02-29", "2026-04-31", "invalid"]) assert.equal(expenseSchema.safeParse({ ...expense, date }).success, false);
});
