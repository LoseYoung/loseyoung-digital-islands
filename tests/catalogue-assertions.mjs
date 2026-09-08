import assert from "node:assert/strict";

export function assertCatalogue(html) {
  const document = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const text = document.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  assert.match(document, /<html[^>]+lang="zh-CN"/);
  assert.equal([...document.matchAll(/<h1\b/g)].length, 1, "one page heading");
  for (const copy of [
    "Somewhere Between", "Real and", "Imagined", "Curatorial Note",
    "Selected", "More to", "A Softer Gaze", "Another Reality", "Further Out",
    "Not Yet Open", "To Be Named", "Forthcoming",
  ]) assert.ok(text.includes(copy), `missing catalogue content: ${copy}`);
  assert.doesNotMatch(text, /THREE ISLANDS ONLINE|把灵感，安放在|Building your site/);
  for (const host of [
    "photos-island.lzy793222567.chatgpt.site",
    "faerie-britain-echoes.lzy793222567.chatgpt.site",
    "digital-island-gridwake.lzy793222567.chatgpt.site",
  ]) {
    const link = [...document.matchAll(/<a\b[^>]*>/g)].map(([tag]) => tag)
      .find((tag) => tag.includes(`href="https://${host}/"`));
    assert.ok(link, `missing island: ${host}`);
    assert.match(link, /target="_blank"/);
    assert.match(link, /rel="noopener noreferrer"/);
    assert.match(link, /aria-label="[^"]*在新标签页打开"/);
  }
  const ids = new Set([...document.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  for (const [, id] of document.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(ids.has(id), `broken section link: #${id}`);
  }
  const future = document.match(/<section\b[^>]*id="future"[\s\S]*?<\/section>/)?.[0];
  assert.ok(future, "future section remains server-rendered");
  assert.doesNotMatch(future, /<(?:a|button)\b/, "unopened islands must not have dead actions");
  assert.doesNotMatch(document, /data-reveal-state="pending"/, "content must be visible before JavaScript runs");
}
