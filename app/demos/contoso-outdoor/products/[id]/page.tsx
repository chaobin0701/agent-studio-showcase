import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getProduct, products } from "@/lib/contoso/service";
import { productManual } from "@/lib/contoso/manuals";
import { formatCny } from "@/lib/contoso/localization";
import { SiteShell } from "@/components/site-shell";
export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();
  const manual = productManual(product);
  return (
    <SiteShell>
      <section className="site-section site-container">
        <Link href="/chat/contoso-outdoor" className="text-xs text-primary">
          ← 返回户外装备顾问
        </Link>
        <p className="section-kicker mt-8 mb-4">户外装备 · 样例商品</p>
        <h1 className="section-title">{product.name}</h1>
        <p className="mt-5 text-lg font-medium">
          {formatCny(product.price)}{" "}
          <span className="text-xs font-normal text-waterloo">
            · 人民币模拟价格 · {product.categoryName}
          </span>
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-waterloo">
          {product.description}
        </p>
        <div className="mt-12 max-w-3xl border-t border-stroke pt-8">
          <h2 className="mb-4 text-xl font-semibold">中文商品说明书</h2>
          <p className="mb-8 text-xs leading-6 text-waterloo">
            根据 Contoso Chat 的公开演示资料翻译改编，原文及授权保留。
            聊天中可核对同一份中文说明书依据。模拟商品不提供购买、库存与物流服务。
          </p>
          <article className="prose prose-sm max-w-none prose-headings:font-semibold prose-p:leading-7">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{manual}</ReactMarkdown>
          </article>
        </div>
        <p className="mt-12 text-xs text-waterloo">
          来源：
          <a
            href="https://github.com/Azure-Samples/contoso-chat"
            className="text-primary"
          >
            Contoso Chat
          </a>{" "}
          · MIT · 公开模拟资料
        </p>
      </section>
    </SiteShell>
  );
}
