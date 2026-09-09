import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { assertCatalogue } from "./catalogue-assertions.mjs";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("https://portal.example/", { headers: { accept: "text/html", host: "portal.example", "x-forwarded-host": "untrusted.example", "x-forwarded-proto": "https" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("Sites server-renders the entire catalogue and safe navigation without JavaScript", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assertCatalogue(html);
  assert.match(html, /https:\/\/loseyoung-digital-islands\.lzy793222567\.chatgpt\.site\/og\.png/);
  assert.doesNotMatch(html, /untrusted\.example|portal\.example/);
  assert.match(html, /src="\/moonlit-ocean-pramod-tiwari\.jpg"/);
});

test("keeps imagery, fonts and reduced-motion fallback local", async () => {
  await Promise.all([
    "public/moonlit-ocean-pramod-tiwari.jpg", "public/og.png", "public/photos-island.png",
    "public/faerie-britain.png", "public/gridwake.png", "app/fonts/OFL.txt",
    "app/fonts/cormorant-garamond-regular.ttf", "app/fonts/cormorant-garamond-italic.ttf",
  ].map((file) => access(new URL(`../${file}`, import.meta.url))));
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /data-reveal-state="pending"[^}]*opacity:\s*1/s);
  assert.doesNotMatch(css, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
});
