import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "LoseYoung · 数字岛屿";
const description = "汇集正在创造与维护的网页，在星海之间探索每一座数字岛屿。";

export async function generateMetadata(): Promise<Metadata> {
  // Pages 在构建时生成分享地址；Sites 仍按每次请求的域名生成。
  let origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
    const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    origin = `${protocol}://${host}`;
  }
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: `${origin}/og.png`, width: 1536, height: 1024, alt: "LoseYoung 数字岛屿门户" }] },
    twitter: { card: "summary_large_image", title, description, images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}