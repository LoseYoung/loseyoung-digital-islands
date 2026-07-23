import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("https://portal.example/", { headers: { accept: "text/html", host: "portal.example", "x-forwarded-proto": "https" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the personal portal and Photos Island entry", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /LoseYoung · 数字岛屿/);
  assert.match(html, /把灵感，安放在/);
  assert.match(html, /照片岛/);
  assert.match(html, /https:\/\/photos-island\.lzy793222567\.chatgpt\.site\//);
  assert.match(html, /https:\/\/portal\.example\/og\.png/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/);
});

test("removes starter-only assets and keeps project previews local", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(page, /photos-island\.lzy793222567\.chatgpt\.site/);
  assert.match(page, /target="_blank"/);
  assert.match(page, /prefers-reduced-motion/);
  assert.match(layout, /summary_large_image/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/photos-island.png", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview", root)));
});