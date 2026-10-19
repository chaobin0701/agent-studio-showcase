import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Agent Studio · 构建、发布并运行通用 Agent",
    template: "%s · Agent Studio",
  },
  description: "了解 Agent Studio 如何管理模型、Prompt、Skill、知识库与工具，通过 Deep Agents 运行可追溯的 Agent，并体验由平台构建的应用。",
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
