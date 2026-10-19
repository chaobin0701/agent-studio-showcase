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
        <div><p className="section-kicker">技术实现</p><h2>这些应用如何由 Agent Studio 构建？</h2><p>查看执行链、发布快照、知识检索与工具接入的实现方式。</p></div>
        <Link href="/platform" className="secondary-button">平台技术实现 <ArrowUpRight size={17} /></Link>
      </div></section>
    </SiteShell>
  );
}
