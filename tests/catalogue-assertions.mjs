import assert from "node:assert/strict";

export function assertCatalogue(html) {
  const document = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const text = document.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  assert.match(document, /<html[^>]+lang="zh-CN"/);
  assert.equal([...document.matchAll(/<h1\b/g)].length, 1, "one page heading");
  for (const copy of [
    "Somewhere Between", "Real and", "Imagined", "Curatorial Note",
    "Selected", "More to", "A Softer Gaze", "Another Reality", "Further Out",
    "A Journey, in Conversation", "Not Yet Open", "To Be Named", "Forthcoming",
  ]) assert.ok(text.includes(copy), `缺少目录内容：${copy}`);
  assert.doesNotMatch(text, /THREE ISLANDS ONLINE|把灵感，安放在|Building your site/);
  for (const host of [
    "photos-island.lzy793222567.chatgpt.site",
    "faerie-britain-echoes.lzy793222567.chatgpt.site",
    "digital-island-gridwake.lzy793222567.chatgpt.site",
    "roamisle.lzy793222567.chatgpt.site",
  ]) {
    const link = [...document.matchAll(/<a\b[^>]*>/g)].map(([tag]) => tag)
      .find((tag) => tag.includes(`href="https://${host}/"`));
    assert.ok(link, `缺少岛屿入口：${host}`);
    assert.match(link, /target="_blank"/);
    assert.match(link, /rel="noopener noreferrer"/);
    assert.match(link, /aria-label="[^"]*在新标签页打开"/);
  }
  const ids = new Set([...document.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  for (const [, id] of document.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(id), `页内链接不存在：#${id}`);
  const future = document.match(/<section\b[^>]*id="future"[\s\S]*?<\/section>/)?.[0];
  assert.ok(future, "预留目录必须由服务端渲染");
  assert.doesNotMatch(future, /<(?:a|button)\b/, "尚未开放的岛屿不能提供虚假操作");
  assert.doesNotMatch(document, /data-reveal-state="pending"/, "脚本运行前内容必须可见");
  for (const [, contents] of document.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)) {
    assert.doesNotMatch(contents, /<button\b/, "实验按钮不能嵌套在外链中");
  }
  assert.equal([...document.matchAll(/class="cover-launch"[^>]*hidden/g)].length, 4, "无脚本时隐藏四个实验按钮，保留入口");
  assert.match(document, /id="play-roamisle"/);
  assert.match(document, /class="star-skipping"[^>]*hidden/);
}
