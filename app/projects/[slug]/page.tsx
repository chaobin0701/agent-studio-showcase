import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { ScenarioProject } from "@/components/scenario-project";
import { projects } from "@/lib/catalog";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);
  return { title: project ? `${project.name} · 项目介绍` : "项目不存在", description: project?.description };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);
  if (!project) notFound();
  return (
    <SiteShell>
      <ScenarioProject project={project} />
    </SiteShell>
  );
}
