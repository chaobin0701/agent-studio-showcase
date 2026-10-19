import { SiteShell } from "@/components/site-shell";
import { ProjectList } from "@/components/project-list";

export const metadata = { title: "全部项目" };
export default function Page() {
  return (
    <SiteShell>
      <section className="site-section site-container min-h-[70vh]">
        <p className="section-kicker mb-5">全部项目</p>
        <h1 className="section-title">从平台能力，到具体应用。</h1>
        <p className="mt-5 max-w-xl text-sm leading-8 text-waterloo">了解项目的能力，也可以直接开始一段对话。</p>
        <ProjectList />
      </section>
    </SiteShell>
  );
}
