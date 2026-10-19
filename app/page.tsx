import { SiteShell } from "@/components/site-shell";
import Hero from "@/components/solid/hero";
import { DemoList } from "@/components/demo-list";

export default function Home() {
  return (
    <SiteShell>
      <Hero />
      <section className="site-section site-container" id="demos">
        <div className="experience-heading">
          <div><p className="section-kicker mb-4">应用体验</p>
            <h2 className="section-title">从好奇，开始一场体验。</h2></div>
          <p className="max-w-sm text-sm leading-7 text-waterloo">选一套露营装备，查一份使用说明，<br className="hidden sm:block" />或探索模拟家庭的清洁记录。</p>
        </div>
        <DemoList />
      </section>
    </SiteShell>
  );
}
