import { spawnSync } from "node:child_process";

// 默认生成当前仓库的项目站点；也支持账号主页或显式指定发布地址。
const repository = process.env.GITHUB_REPOSITORY || "LoseYoung/loseyoung-digital-islands";
const [owner, name] = repository.split("/");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ??
  (name.toLowerCase() === `${owner.toLowerCase()}.github.io` ? "" : `/${name}`);
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${owner.toLowerCase()}.github.io${basePath}`;

// 使用已有 Next.js 依赖导出静态文件，避免在 Pages 中引入 Worker 运行时。
const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    GITHUB_PAGES: "true",
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_SITE_URL: siteUrl.replace(/\/$/, ""),
  },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
