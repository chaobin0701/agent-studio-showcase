import { SiteShell } from "@/components/site-shell";
import { PlatformSections } from "@/components/platform-sections";

export const metadata = {
  title: "平台技术实现",
  description: "了解 Agent Studio 的发布快照、Deep Agents 执行链、RAG 检索、HTTP/MCP 工具治理与技术栈。",
};

export default function Page() {
  return <SiteShell><PlatformSections /></SiteShell>;
}
