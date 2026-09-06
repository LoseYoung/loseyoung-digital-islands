import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

async function render() {
  const { default: worker } = await import("../dist/server/index.js");
  return worker.fetch(
    new Request("https://portal.example/", { headers: { accept: "text/html", host: "portal.example", "x-forwarded-proto": "https" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("portal renders all three island destinations with safe external links", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /LoseYoung/);
  assert.match(html, /ISLANDS ONLINE/);
  for (const slug of ["photos-island", "faerie-britain-echoes", "digital-island-gridwake"]) {
    const url = `https://${slug}.lzy793222567.chatgpt.site/`;
    const links = [...html.matchAll(/<a\b[^>]*>/g)].map(([link]) => link).filter(link => link.includes(`href="${url}"`));
    assert.equal(links.length, 3, `${slug} is linked in header, map and project card`);
    for (const link of links) {
      assert.match(link, /target="_blank"/);
      assert.match(link, /rel="noopener noreferrer"/);
    }
  }
  assert.match(html, /栅域余烬/);
  assert.doesNotMatch(html, /TWO ISLANDS|第三座岛屿|尚未命名|Your site is taking shape/);
  assert.match(html, /https:\/\/portal\.example\/og\.png/);
});

test("all local visuals and existing share artwork are available", async () => {
  for (const path of ["archipelago-night.webp", "photos-island.png", "faerie-britain.png", "og.png"]) {
    await access(new URL(`../public/${path}`, import.meta.url));
  }
});
