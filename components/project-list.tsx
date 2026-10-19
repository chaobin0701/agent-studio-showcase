import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bot, BookOpen, ChartNoAxesCombined, Layers2, Plug, ShoppingBag, Sun, Tent } from "lucide-react";
import { projects } from "@/lib/catalog";

const icons = { agents: Layers2, knowledge: BookOpen, tools: Plug, report: ChartNoAxesCombined, weather: Sun, shopping: Tent, manuals: BookOpen, orders: ShoppingBag };

export function ProjectList() {
  return (
    <div className="mt-12 space-y-6">
      {projects.map((project) => {
        const isPlatform = project.slug === "agent-studio";
        const Icon = isPlatform ? Layers2 : project.slug === "robot-lab" ? Bot : Tent;
        return (
          <article key={project.slug} className="project-card">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <p className="section-kicker mb-4 flex items-center gap-2"><Icon size={16} />{project.label}</p>
                <h2 className="text-2xl font-semibold tracking-tight md:text-3xl"><Link href={`/projects/${project.slug}`}>{project.name}</Link></h2>
                <p className="mt-4 text-sm leading-7 text-waterloo">{project.description}</p>
              </div>
              <Link href={isPlatform ? "/projects/agent-studio" : `/chat/${project.demoSlugs[0]}`} className="primary-button">
                {isPlatform ? "了解平台" : "开始聊天"}<ArrowRight size={16} />
              </Link>
            </div>
            <div className="mt-8 grid gap-7 border-t border-[#e5ebf5] pt-8 sm:grid-cols-3">
              {project.features.map((feature) => { const FeatureIcon = icons[feature.key]; return (
                <div key={feature.key}>
                  <FeatureIcon className="mb-3 text-primary" size={22} strokeWidth={1.6} />
                  <h3 className="mb-2 text-sm font-semibold">{feature.name}</h3>
                  <p className="text-xs leading-7 text-waterloo">{feature.description}</p>
                </div>
              ); })}
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs">
              <p className="text-[#929bad]">{isPlatform ? "从配置、资料到工具调用，在同一个后台管理。" : "在同一段对话里继续提问，无需切换模式。"}</p>
              <Link href={`/projects/${project.slug}`} className="inline-flex items-center gap-1 text-primary hover:underline">查看项目详情<ArrowUpRight size={14} /></Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
