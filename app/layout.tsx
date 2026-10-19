import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Agent Studio · 让智能体能力成为真实体验",
    template: "%s · Agent Studio",
  },
  description: "探索 Agent Studio 的智能体、知识库与工具能力，体验扫地机器人助手和户外装备顾问。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
