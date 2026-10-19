import { notFound, redirect } from "next/navigation";
import { findDemo } from "@/lib/catalog";
import { ChatWorkspace } from "@/components/chat-workspace";
export default async function Page({
  params,
}: {
  params: Promise<{ demoSlug: string }>;
}) {
  const { demoSlug } = await params;
  const demo = findDemo(demoSlug);
  if (!demo) notFound();
  if (demo.slug !== demoSlug) redirect(`/chat/${demo.slug}`);
  return <ChatWorkspace key={demo.slug} demo={demo} />;
}
