import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Agent Studio · 构建、发布并运行通用 Agent",
    template: "%s · Agent Studio",
  },
  description: "Agent Studio 是基于 LangChain 与 Deep Agents 的通用 Agent 构建平台，支持版本发布、知识检索、HTTP/MCP 工具接入与可追踪执行。",
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
