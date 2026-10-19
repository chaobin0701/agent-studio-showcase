import { SiteShell } from "@/components/site-shell";
import { ProjectList } from "@/components/project-list";

export const metadata = { title: "全部应用" };
export default function Page() {
  return (
    <SiteShell>
      <section className="site-section site-container min-h-[70vh]">
        <p className="section-kicker mb-5">全部应用</p>
        <h1 className="section-title">探索由 Agent Studio 构建的应用。</h1>
        <p className="mt-5 max-w-xl text-sm leading-8 text-waterloo">先了解应用的资料与能力，也可以直接开始对话。</p>
        <ProjectList />
      </section>
    </SiteShell>
  );
}
