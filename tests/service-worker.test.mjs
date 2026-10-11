import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const ORIGIN = "https://student.example";

function harness({ fetchImpl = async () => new Response("network"), clients = [], version = "test", origin = ORIGIN } = {}) {
  const listeners = new Map();
  const stores = new Map();
  const opened = [];
  let skipped = false;
  const key = (request) => new URL(typeof request === "string" ? request : request.url, ORIGIN).href;
  const cacheApi = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async put(request, response) { store.set(key(request), response.clone()); },
        async match(request) { return store.get(key(request))?.clone(); },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
  const self = {
    location: { href: `${origin}/sw.js?v=${version}`, origin },
    addEventListener(type, callback) { listeners.set(type, callback); },
    skipWaiting() { skipped = true; },
    clients: {
      async claim() {},
      async matchAll() { return clients; },
      async openWindow(url) { opened.push(url); },
    },
    registration: { async showNotification() {} },
  };
  vm.runInNewContext(source, { self, caches: cacheApi, fetch: fetchImpl, URL, Response });
  return {
    stores, opened, cacheApi,
    get skipped() { return skipped; },
    async dispatch(type, properties = {}) {
      const work = [];
      let response;
      listeners.get(type)({
        ...properties,
        waitUntil(promise) { work.push(promise); },
        respondWith(promise) { response = promise; },
      });
      await Promise.all(work);
      return response ? await response : undefined;
    },
  };
}

const request = (path, mode = "navigate") => ({ url: `${ORIGIN}${path}`, method: "GET", mode });

test("development leaves reused CSS and JS URLs on the network and replaces stale workers", async () => {
  for (const options of [{ version: "dev" }, { origin: "http://localhost:3000", version: "commit-sha" }]) {
    const app = harness(options);
    await app.dispatch("install");
    assert.equal(app.skipped, true);
    const origin = options.origin ?? ORIGIN;
    for (const file of ["styles.css", "page.js"]) {
      const result = await app.dispatch("fetch", { request: { url: `${origin}/_next/static/${file}`, method: "GET", mode: "cors" } });
      assert.equal(result, undefined);
    }
  }
});

test("offline navigation serves the public fallback without caching personal pages", async () => {
  let online = true;
  const app = harness({ fetchImpl: async () => {
    if (!online) throw new Error("offline");
    return new Response("public offline page");
  } });
  await app.dispatch("install");
  const onlinePage = await app.dispatch("fetch", { request: request("/dashboard") });
  assert.equal(await onlinePage.text(), "public offline page");
  assert.equal(app.stores.get("student-app-v2-test").has(`${ORIGIN}/dashboard`), false);
  online = false;
  const response = await app.dispatch("fetch", { request: request("/dashboard") });
  assert.equal(await response.text(), "public offline page");
  assert.equal(response.headers.get("content-type"), "text/plain;charset=UTF-8");
});

test("API, optimized images and RSC requests are never replaced with offline HTML", async () => {
  const app = harness({ fetchImpl: async () => { throw new Error("offline"); } });
  for (const path of ["/api/ai/image/private.png", "/_next/image?url=private.png", "/dashboard?_rsc=1", "/uploads/private.png"]) {
    assert.equal(await app.dispatch("fetch", { request: request(path, "cors") }), undefined);
  }
});

test("offline navigation always returns a valid response even with an empty cache", async () => {
  const app = harness({ fetchImpl: async () => { throw new Error("offline"); } });
  const response = await app.dispatch("fetch", { request: request("/tasks") });
  assert.equal(response.status, 503);
  assert.match(await response.text(), /Internet/);
});

test("installation refuses an auth redirect as the offline fallback", async () => {
  const app = harness({ fetchImpl: async () => ({ ok: true, redirected: true }) });
  await assert.rejects(app.dispatch("install"), /Offline page/);
  assert.equal(app.stores.size, 0);
});

test("public build assets are cached, and activation removes old app caches only", async () => {
  let calls = 0;
  const app = harness({ fetchImpl: async () => { calls += 1; return new Response("asset"); } });
  await app.cacheApi.open("student-app-old");
  await app.cacheApi.open("another-app");
  const assetRequest = request("/_next/static/hash/app.js", "cors");
  assert.equal(await (await app.dispatch("fetch", { request: assetRequest })).text(), "asset");
  assert.equal(await (await app.dispatch("fetch", { request: assetRequest })).text(), "asset");
  assert.equal(calls, 1);
  await app.dispatch("activate");
  assert.equal(app.stores.has("student-app-old"), false);
  assert.equal(app.stores.has("another-app"), true);
  assert.equal(app.stores.has("student-app-v2-test"), true);
});

test("notification click navigates the existing window to its target before focusing", async () => {
  const calls = [];
  const client = {
    url: `${ORIGIN}/dashboard`,
    async navigate(url) { calls.push(["navigate", url]); return this; },
    async focus() { calls.push(["focus"]); },
  };
  const app = harness({ clients: [client] });
  await app.dispatch("notificationclick", {
    notification: { close() { calls.push(["close"]); }, data: { url: "/tasks?filter=today" } },
  });
  assert.deepEqual(calls, [["close"], ["navigate", `${ORIGIN}/tasks?filter=today`], ["focus"]]);
  assert.deepEqual(app.opened, []);
});

test("external notification URLs cannot navigate the user outside the app", async () => {
  const app = harness();
  await app.dispatch("notificationclick", {
    notification: { close() {}, data: { url: "https://untrusted.example/login" } },
  });
  assert.deepEqual(app.opened, [`${ORIGIN}/dashboard`]);
});

test("failed window navigation opens the requested route in a new window", async () => {
  const app = harness({ clients: [{ url: `${ORIGIN}/dashboard`, async navigate() { throw new Error("closed"); } }] });
  await app.dispatch("notificationclick", { notification: { close() {}, data: { url: "/goals" } } });
  assert.deepEqual(app.opened, [`${ORIGIN}/goals`]);
});

test("updates activate only after the client asks the waiting worker", async () => {
  const app = harness();
  assert.equal(app.skipped, false);
  await app.dispatch("message", { data: { type: "SKIP_WAITING" } });
  assert.equal(app.skipped, true);
});
