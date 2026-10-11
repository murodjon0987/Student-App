import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { Prisma } from "@prisma/client";
import ts from "typescript";
import * as imageModule from "../src/lib/image";
import { fail, ok } from "../src/lib/types";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);
const textBytes = (value: string) => new TextEncoder().encode(value);

function loadModule<T>(relativePath: string, dependencies: Record<string, unknown>, globals = {}) {
  const filename = path.resolve(relativePath);
  const localRequire = createRequire(filename);
  const testModule = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  });
  runInNewContext(outputText, {
    module: testModule, exports: testModule.exports,
    require: (id: string) => dependencies[id] ?? localRequire(id),
    File, FormData, Response, Uint8Array, Date, URL,
    console: { error() {} }, ...globals,
  }, { filename });
  return testModule.exports as T;
}

test("raster detection accepts JPEG/PNG/GIF/WebP and rejects HTML/SVG and unknown RIFF files", () => {
  const cases: [Uint8Array, string][] = [
    [jpeg, "image/jpeg"],
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"],
    [textBytes("GIF87a"), "image/gif"], [textBytes("GIF89a"), "image/gif"],
    [textBytes("RIFF1234WEBPVP8 "), "image/webp"],
    [textBytes("RIFF1234WEBPVP8L"), "image/webp"],
    [textBytes("RIFF1234WEBPVP8X"), "image/webp"],
  ];
  for (const [bytes, mime] of cases) assert.equal(imageModule.detectRasterImageMime(bytes), mime);
  for (const bytes of [new Uint8Array(), textBytes("<svg onload='alert(1)'></svg>"), textBytes("<!doctype html><script>alert(1)</script>"), textBytes("RIFF1234WAVEdata")]) {
    assert.equal(imageModule.detectRasterImageMime(bytes), null);
  }
});

type UploadResult = { success: boolean; error?: string; data?: { id: string } };
type UploadActions = { uploadListingImage(form: FormData): Promise<UploadResult> };

function uploadForm(bytes = jpeg, mime = "image/jpeg") {
  const form = new FormData();
  form.set("listingId", "listing-a");
  form.set("file", new File([bytes], "photo.jpg", { type: mime }));
  return form;
}

function loadUpload(db: unknown) {
  return loadModule<UploadActions>("src/features/housing/actions.ts", {
    "next/cache": { revalidatePath() {} },
    "@/lib/prisma": { prisma: db },
    "@/lib/auth/dal": { async verifySession() { return { userId: "student-a" }; } },
    "@/lib/types": { fail, ok },
    "@/lib/image": imageModule,
  });
}

test("upload rejects forged raster MIME, SVG, mismatched signatures and oversized files before writing", async () => {
  let transactions = 0;
  const actions = loadUpload({ async $transaction() { transactions++; throw new Error("Should not write"); } });
  for (const form of [
    uploadForm(textBytes("<svg onload='alert(1)'/>"), "image/jpeg"),
    uploadForm(textBytes("<svg/>"), "image/svg+xml"),
    uploadForm(jpeg, "image/png"),
    uploadForm(new Uint8Array(4_000_001), "image/jpeg"),
  ]) assert.equal((await actions.uploadListingImage(form)).success, false);
  assert.equal(transactions, 0);
});

test("concurrent uploads use serializable transactions and cannot exceed ten images", async () => {
  const positions = Array.from({ length: 9 }, (_, index) => index);
  let queue: Promise<unknown> = Promise.resolve();
  const tx = {
    housingListing: { async findFirst({ where }: { where: { userId: string } }) { assert.equal(where.userId, "student-a"); return { id: "listing-a" }; } },
    housingImage: {
      async aggregate() { return { _count: { _all: positions.length }, _max: { position: Math.max(...positions) } }; },
      async create({ data }: { data: { position: number; mimeType: string } }) {
        assert.equal(data.mimeType, "image/jpeg");
        positions.push(data.position);
        return { id: `image-${data.position}` };
      },
    },
  };
  const actions = loadUpload({
    $transaction(callback: (client: typeof tx) => Promise<UploadResult>, options: { isolationLevel: string }) {
      assert.equal(options.isolationLevel, "Serializable");
      const result = queue.then(() => callback(tx));
      queue = result.catch(() => {});
      return result;
    },
  });
  const result = await Promise.all([actions.uploadListingImage(uploadForm()), actions.uploadListingImage(uploadForm())]);
  assert.equal(result.filter((item) => item.success).length, 1);
  assert.equal(positions.length, 10);
  assert.equal(new Set(positions).size, 10);
});

test("upload retries serialization conflicts and assigns max position plus one after deletions", async () => {
  let attempts = 0;
  let position: number | undefined;
  const tx = {
    housingListing: { async findFirst() { return { id: "listing-a" }; } },
    housingImage: {
      async aggregate() { return { _count: { _all: 2 }, _max: { position: 2 } }; },
      async create({ data }: { data: { position: number } }) { position = data.position; return { id: "new-image" }; },
    },
  };
  const actions = loadUpload({ async $transaction(callback: (client: typeof tx) => Promise<UploadResult>) {
    if (++attempts === 1) throw new Prisma.PrismaClientKnownRequestError("Serialization conflict", { code: "P2034", clientVersion: "test" });
    return callback(tx);
  } });
  assert.equal((await actions.uploadListingImage(uploadForm())).success, true);
  assert.equal(attempts, 2);
  assert.equal(position, 3);
});

test("upload checks listing ownership inside the transaction", async () => {
  const tx = { housingListing: { async findFirst() { return null; } } };
  const actions = loadUpload({ async $transaction(callback: (client: typeof tx) => Promise<UploadResult>) { return callback(tx); } });
  const result = await actions.uploadListingImage(uploadForm());
  assert.equal(result.success, false);
  assert.equal(result.error, "E'lon topilmadi");
});

test("image route rejects legacy SVG and derives safe response MIME from bytes", async () => {
  let bytes = textBytes("<svg onload='alert(1)'/>");
  const route = loadModule<{ GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }>(
    "src/app/api/housing/image/[id]/route.ts", {
      "@/lib/prisma": { prisma: { housingImage: { async findUnique() { return { data: bytes, mimeType: "image/svg+xml" }; } } } },
      "@/lib/auth/session": { async getAuthenticatedSession() { return { userId: "student-a" }; } },
      "@/lib/image": imageModule,
    }
  );
  const request = new Request("https://student.example.com/api/housing/image/image-a");
  const context = { params: Promise.resolve({ id: "image-a" }) };
  assert.equal((await route.GET(request, context)).status, 404);
  bytes = jpeg;
  const response = await route.GET(request, context);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/jpeg");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
});

type Element = { type: unknown; props: { children?: unknown; type?: string; onChange?: (event: unknown) => void } };
function findFileInput(value: unknown): Element | undefined {
  if (Array.isArray(value)) {
    for (const child of value) { const found = findFileInput(child); if (found) return found; }
  } else if (value && typeof value === "object" && "props" in value) {
    const node = value as Element;
    if (node.type === "input" && node.props.type === "file") return node;
    return findFileInput(node.props.children);
  }
  return undefined;
}

test("partial upload failure stays on the form, retries only failed files and reuses the saved listing", async () => {
  const states: unknown[] = [];
  let hookIndex = 0;
  let formValues: Record<string, unknown>;
  let submit: () => Promise<void> = async () => { throw new Error("Submit not captured"); };
  const savedIds: unknown[] = [];
  const uploads: string[] = [];
  const navigations: string[] = [];
  const successMessages: string[] = [];
  const errorMessages: string[] = [];
  const componentStub = new Proxy({}, { get: (_object, key) => key === "__esModule" ? true : String(key) });
  const components = ["button", "input", "label", "badge", "select"].map((name) => [`@/components/ui/${name}`, componentStub]);
  const component = loadModule<{ ListingForm(props: object): Element }>("src/features/housing/components/listing-form.tsx", {
    ...Object.fromEntries(components),
    "@/components/shared/page-header": componentStub,
    "@/features/housing/components/housing-map": { default: "Map" },
    "lucide-react": componentStub,
    "react/jsx-runtime": { jsx: (type: unknown, props: object) => ({ type, props }), jsxs: (type: unknown, props: object) => ({ type, props }) },
    "react": {
      useState(initial: unknown) {
        const index = hookIndex++;
        if (index >= states.length) states[index] = initial;
        return [states[index], (value: unknown) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
      },
      useMemo(factory: () => unknown) { return factory(); }, useEffect() {},
    },
    "react-hook-form": { useForm({ defaultValues }: { defaultValues: Record<string, unknown> }) {
      formValues ??= { ...defaultValues };
      return {
        register: () => ({}), watch: (name: string) => formValues[name],
        setValue(name: string, value: unknown) { formValues[name] = value; },
        handleSubmit(handler: (values: Record<string, unknown>) => Promise<void>) {
          submit = () => handler({ ...formValues }); return submit;
        },
        formState: { errors: {}, isSubmitting: false },
      };
    } },
    "@hookform/resolvers/zod": { zodResolver: () => ({}) },
    "next/navigation": { useRouter: () => ({ push: (url: string) => navigations.push(url), refresh() {}, back() {} }) },
    "sonner": { toast: { success: (message: string) => successMessages.push(message), error: (message: string) => errorMessages.push(message) } },
    "@/lib/utils": { cn: () => "" }, "@/lib/image": imageModule,
    "@/features/housing/image-utils": { async compressImage(file: File) { return file; } },
    "@/features/housing/schema": createRequire(path.resolve("tests/housing-images.test.ts"))(path.resolve("src/features/housing/schema.ts")),
    "@/features/housing/actions": {
      async saveListing(input: { id?: string }) { savedIds.push(input.id); return ok({ id: "saved-listing" }); },
      async uploadListingImage(form: FormData) {
        const file = form.get("file") as File;
        uploads.push(file.name);
        if (uploads.length === 2) return fail("Yuklashda xatolik");
        return ok({ id: `image-${uploads.length}` });
      },
      async deleteListingImage() { return ok(); },
    },
  }, { URL: { createObjectURL: (file: File) => `blob:${file.name}`, revokeObjectURL() {} } });
  const render = () => { hookIndex = 0; return component.ListingForm({}); };
  const input = findFileInput(render());
  assert.ok(input?.props.onChange);
  input.props.onChange({ target: { files: [new File([jpeg], "good.jpg", { type: "image/jpeg" }), new File([jpeg], "retry.jpg", { type: "image/jpeg" })], value: "selected" } });
  render();
  await submit();
  assert.deepEqual(navigations, []);
  assert.deepEqual(successMessages, []);
  assert.ok(errorMessages.some((message) => message.includes("1 ta rasm yuklanmadi")));
  render();
  await submit();
  assert.deepEqual(savedIds, [undefined, "saved-listing"]);
  assert.deepEqual(uploads, ["good.jpg", "retry.jpg", "retry.jpg"]);
  assert.deepEqual(navigations, ["/housing/saved-listing"]);
  assert.equal(successMessages.length, 1);
});
