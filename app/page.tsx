import { SiteShell } from "@/components/site-shell";
import Hero from "@/components/solid/hero";
import { DemoList } from "@/components/demo-list";
import { PlatformNav, PlatformSections } from "@/components/platform-sections";

export default function Home() {
  return (
    <SiteShell>
      <Hero />
      <PlatformNav />
      <section className="site-section site-container home-demos" id="demos">
        <div className="experience-heading">
          <div><p className="section-kicker mb-4">应用体验</p>
            <h2 className="section-title">体验由 Agent Studio 构建的 LLM 应用。</h2></div>
          <p className="max-w-sm text-[15px] leading-7 text-waterloo">选择一个场景，查看它如何把知识与工具连接成一次对话。</p>
        </div>
        <DemoList />
      </section>
      <PlatformSections />
    </SiteShell>
  );
}
