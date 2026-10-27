import { SiteShell } from "@/components/site-shell";
import Hero from "@/components/solid/hero";
import { DemoList } from "@/components/demo-list";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function Home() {
  return (
    <SiteShell>
      <Hero />
      <section className="site-section site-container home-demos" id="demos">
        <div className="experience-heading">
          <div><p className="section-kicker mb-4">应用体验</p>
            <h2 className="section-title">选一个应用，直接开始对话。</h2></div>
        </div>
        <DemoList />
      </section>
      <section className="home-platform-bridge"><div className="site-container home-platform-bridge-inner">
        <div><p className="section-kicker">技术实现</p><h2>Agent Studio 如何构建和运行 Agent？</h2><p>了解平台如何管理 Agent 配置与版本快照，并编排模型、知识检索、Tools 和 MCP 完成请求。</p></div>
        <Link href="/platform" className="secondary-button">平台技术实现 <ArrowUpRight size={17} /></Link>
      </div></section>
    </SiteShell>
  );
}
