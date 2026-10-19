import { SiteShell } from "@/components/site-shell";
import { DemoList } from "@/components/demo-list";

export const metadata = { title: "全部应用" };
export default function Page() {
  return (
    <SiteShell>
      <section className="site-section site-container min-h-[70vh] app-index">
        <p className="section-kicker mb-5">全部应用</p>
        <h1 className="section-title">选择一个应用。</h1>
        <p className="mt-5 max-w-xl text-sm leading-8 text-waterloo">直接开始聊天，或先了解它能回答什么、有哪些演示资料。</p>
        <DemoList />
      </section>
    </SiteShell>
  );
}
