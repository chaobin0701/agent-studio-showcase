import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { findDemo } from "@/lib/catalog";
import { RobotData } from "@/components/robot-data";
import { ContosoData } from "@/components/contoso-data";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const demo = findDemo(slug);
  if (!demo) notFound();
  if (demo.slug !== slug) redirect(`/demos/${demo.slug}`);
  return (
    <SiteShell>
      <section className="site-section site-container">
        <Link
          href="/#demos"
          className="mb-10 inline-flex gap-2 text-xs text-waterloo"
        >
          <ArrowLeft size={14} />
          全部体验
        </Link>
        <p className="section-kicker mb-5">{demo.eyebrow}</p>
        <h1 className="section-title">{demo.name}</h1>
        <p className="mt-5 max-w-2xl text-sm leading-8 text-waterloo">
          {demo.detail}
        </p>
        <Link href={`/chat/${demo.slug}`} className="primary-button mt-8">
          打开聊天体验 <ArrowRight size={17} />
        </Link>
        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-xl font-semibold">一个助手，三种能力</h2>
            <div className="mt-6 space-y-5">
              {demo.features.map((feature) => (
                <div
                  key={feature.key}
                  className="border-l-2 border-[#c9ddff] pl-4 text-sm leading-7 text-waterloo"
                >
                  <h3 className="mb-1 font-medium text-black">
                    {feature.name}
                  </h3>
                  <p>{feature.description}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-xs leading-7 text-[#9096a4]">
              {demo.dataDescription} 对话由已连接的 Agent
              生成，结果可以在右侧资料中核对。
            </p>
          </div>
          <div className="rounded-xl bg-[#f8faff] p-7">
            {demo.slug === "contoso-outdoor" ? <ContosoData /> : <RobotData />}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
