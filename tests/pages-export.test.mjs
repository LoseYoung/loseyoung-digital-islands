import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { assertCatalogue } from "./catalogue-assertions.mjs";

const output = resolve("out");
const repository = process.env.GITHUB_REPOSITORY || "LoseYoung/loseyoung-digital-islands";
const [owner, name] = repository.split("/");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ??
  (name.toLowerCase() === `${owner.toLowerCase()}.github.io` ? "" : `/${name}`);
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${owner.toLowerCase()}.github.io${basePath}`).replace(/\/$/, "");

test("Pages 导出完整门户并保留三个子站入口", async () => {
  const html = await readFile(resolve(output, "index.html"), "utf8");
  assertCatalogue(html);
  for (const text of ["Digital Islands", "照片岛", "妖精国余响", "栅域余烬"]) {
    assert.ok(html.includes(text), `缺少门户内容：${text}`);
  }
  for (const host of [
    "photos-island.lzy793222567.chatgpt.site",
    "faerie-britain-echoes.lzy793222567.chatgpt.site",
    "digital-island-gridwake.lzy793222567.chatgpt.site",
  ]) {
    assert.ok(html.includes(`href="https://${host}/"`), `缺少子站链接：${host}`);
  }
  assert.ok(html.includes(`content="${siteUrl}/og.png"`), "分享图必须使用 Pages 发布地址");
  assert.doesNotMatch(html, /localhost:3000|portal\.example|codex-preview/);
});

test("Pages 的图片、脚本和样式均能在发布子目录中找到", async () => {
  const html = await readFile(resolve(output, "index.html"), "utf8");
  // 检查实际导出的资源引用，防止仓库子路径丢失导致上线后空白或图片 404。
  const resources = [...html.matchAll(/<(?:script|link|img)\b[^>]*\b(?:src|href)="([^"]+)"/g)]
    .filter((match) => !/rel="(?:preconnect|dns-prefetch)"/.test(match[0]))
    .map((match) => match[1].replaceAll("&amp;", "&"))
    .filter((url) => url.startsWith("/"));
  assert.ok(resources.some((url) => url.includes("/_next/")), "缺少前端构建资源");
  for (const url of resources) {
    const pathname = decodeURIComponent(new URL(url, siteUrl).pathname);
    assert.ok(pathname.startsWith(`${basePath}/`), `资源缺少子路径：${url}`);
    const file = resolve(output, `.${pathname.slice(basePath.length)}`);
    assert.ok(file.startsWith(output + "/") || file.startsWith(output + "\\"), "资源不能越出发布目录");
    await access(file);
  }
  for (const filename of ["photos-island.png", "faerie-britain.png", "gridwake.png", "moonlit-ocean-4k.svg"]) {
    assert.ok(html.includes(`src="${basePath}/${filename}"`), `缺少封面或背景引用：${filename}`);
    await access(resolve(output, filename));
  }
  await access(resolve(output, "og.png"));
});

test("Pages 本地字体使用可解析的子目录资源路径", async () => {
  const html = await readFile(resolve(output, "index.html"), "utf8");
  const styles = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)];
  let fonts = 0;
  for (const [, stylesheet] of styles) {
    const cssUrl = new URL(stylesheet, siteUrl);
    const cssFile = resolve(output, `.${cssUrl.pathname.slice(basePath.length)}`);
    const css = await readFile(cssFile, "utf8");
    for (const [, rawUrl] of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      if (rawUrl.startsWith("data:")) continue;
      const url = new URL(rawUrl, cssUrl);
      assert.equal(url.origin, new URL(siteUrl).origin, "字体和背景应本地托管");
      assert.ok(url.pathname.startsWith(`${basePath}/`), `CSS 资源缺少子路径：${url}`);
      await access(resolve(output, `.${url.pathname.slice(basePath.length)}`));
      if (/\.(ttf|woff2?)$/.test(url.pathname)) fonts++;
    }
  }
  assert.ok(fonts >= 2, "衬线标题的正体和斜体应随站点导出");
});
