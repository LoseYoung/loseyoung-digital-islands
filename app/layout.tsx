import type { Metadata } from "next";
import BuildStamp from "./build-stamp";
import "./globals.css";
import "./exhibition-motion.css";
import "./ambient-background.css";
import "./hero-light-motion.css";
import "./island-index.css";
import "./playgrounds.css";
import "./aim-trainer.css";
import "./craft-playgrounds.css";
import "./continuity.css";

const title = "Digital Islands · LoseYoung";
const description = "那些被看见的、被保存的、被想象过的，都在这里，保持各自的距离。A growing collection of personal worlds.";
// 使用配置的发布地址，不信任请求中的 Host。
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://loseyoung-digital-islands.lzy793222567.chatgpt.site").replace(/\/$/, "");
export const metadata: Metadata = {
  title, description, metadataBase: new URL(`${siteUrl}/`), alternates: { canonical: `${siteUrl}/` },
  openGraph: { title, description, type: "website", url: `${siteUrl}/`, images: [{ url: `${siteUrl}/og.png`, width: 1536, height: 1024, alt: "LoseYoung 数字岛屿门户" }] },
  twitter: { card: "summary_large_image", title, description, images: [`${siteUrl}/og.png`] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}<div className="shell" style={{ paddingBottom: 20 }}><BuildStamp /></div></body></html>;
}
