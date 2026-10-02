"use client";
import { useEffect, useState } from "react";
type BuildInfo = { sourceSha: string | null; target: string; builtAt: string };
export default function BuildStamp() {
  const [info, setInfo] = useState<BuildInfo | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/build-info.json`, { signal: controller.signal, cache: "no-cache" })
      .then(r => r.ok ? r.json() : null).then(value => {
        if (value && (value.sourceSha === null || /^[0-9a-f]{40}$/.test(value.sourceSha)) && ["pages", "sites"].includes(value.target) && typeof value.builtAt === "string") setInfo(value);
      }).catch(() => {});
    return () => controller.abort();
  }, []);
  if (!info) return null;
  return <span className="build-stamp" title={`源码：${info.sourceSha || "未提供"} · 构建时间：${info.builtAt}`}>
    Build / {info.target === "pages" ? "GitHub Pages" : "Sites"} · {info.sourceSha?.slice(0, 10) || "源码标识未提供"}
  </span>;
}
