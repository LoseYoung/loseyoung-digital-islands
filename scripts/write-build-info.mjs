import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
let sourceSha = process.env.BUILD_SOURCE_SHA || process.env.GITHUB_SHA || "";
if (!/^[0-9a-f]{40}$/.test(sourceSha)) {
  try { sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { sourceSha = ""; }
}
const target = process.argv[2] === "pages" ? "pages" : "sites";
await mkdir(new URL("../public/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/build-info.json", import.meta.url), JSON.stringify({ sourceSha: /^[0-9a-f]{40}$/.test(sourceSha) ? sourceSha : null, target, builtAt: new Date().toISOString() }, null, 2) + "\n");
console.log(`已写入${target === "pages" ? " GitHub Pages " : " Sites "}构建标识：${sourceSha || "未提供源码版本"}`);
