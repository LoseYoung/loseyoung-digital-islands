import type { NextConfig } from "next";

// 仅 Pages 构建启用静态导出，保留 Sites 原有的服务端构建行为。
const isPagesBuild = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = isPagesBuild
  ? {
      output: "export",
      basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
      trailingSlash: true,
      // Pages 只检查前端代码，Cloudflare 专用模块由 Sites 构建检查。
      typescript: { tsconfigPath: "./tsconfig.pages.json" },
    }
  : {};

export default nextConfig;
