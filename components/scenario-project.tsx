import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { projects, demosForProject } from "@/lib/catalog";
import { products, customers } from "@/lib/contoso/service";
import { formatCny } from "@/lib/contoso/localization";
import { profiles, months } from "@/lib/robot/service";
import records from "@/data/robot-records.json";
import { contosoTools, robotTools } from "@/lib/project-content";

type Project = (typeof projects)[number];

export function ScenarioProject({ project }: { project: Project }) {
  const outdoor = project.slug === "contoso-outdoor";
  const demo = demosForProject(project.slug)[0];
  const tools = outdoor ? contosoTools : robotTools;
  const base = outdoor ? "/api/contoso" : "/api";
  const facts = outdoor
    ? [`${products.length} 件中文商品`, `${customers.length} 位模拟客户`, `${customers.reduce((n, c) => n + c.orders.length, 0)} 笔模拟购买记录`, "20 份中文说明书"]
    : [`${profiles.length} 个模拟家庭`, `${months.length} 个示例月份`, `${records.length} 条使用记录`, "固定城市天气样本"];
  const construction = outdoor ? [
    ["提示词与指导", "约束选购、说明书和购买记录的回答范围，要求比较规格并说明依据。"],
    ["知识库", "20 份中文商品说明书按商品 ID 建立索引，供使用与保养问题检索。"],
    ["工具", "六个授权工具查询商品、比较规格与读取模拟客户的购买记录。"],
  ] : [
    ["提示词与指导", "指导助手处理知识问答、清洁报告与天气建议，并按需查阅资料。"],
    ["知识库", "机器人使用资料建立索引，给使用方法和故障排查提供引用。"],
    ["工具", "七个授权工具读取模拟家庭、月份、清洁记录和固定天气样本。"],
  ];

  return <>
    <section className="simple-project-hero"><div className="site-container">
      <Link href="/projects" className="project-back"><ArrowLeft size={14} />全部应用</Link>
      <div className="simple-project-hero-grid">
        <div className="simple-project-intro">
          <p className="section-kicker">{outdoor ? "户外装备咨询" : "家庭清洁助手"}</p>
          <h1>{demo.name}</h1>
          <p>{outdoor
            ? "根据商品规格、中文说明书和模拟购买记录，帮助用户选装备、查用法、继续追问。"
            : "把机器人使用资料、模拟家庭记录和固定天气样本放进同一段对话。"}</p>
          <Link href={`/chat/${demo.slug}`} className="primary-button">开始聊天 <ArrowRight size={16} /></Link>
        </div>
        <div className="simple-project-image"><Image src={outdoor ? "/images/applications/outdoor-camp-ai.png" : "/images/applications/robot-home-ai.png"} alt={outdoor ? "湖畔营地的帐篷和户外装备" : "居家场景中的扫地机器人"} fill sizes="(min-width: 768px) 48vw, 100vw" priority /></div>
      </div>
    </div></section>
    <div className="site-container simple-project-body">
      <section className="simple-project-section" aria-labelledby="project-capability-title">
        <h2 id="project-capability-title">可以做什么</h2>
        <div className="simple-project-rows">{demo.features.map((feature) => <div key={feature.key}><h3>{feature.name}</h3><p>{feature.description}</p></div>)}</div>
      </section>
      <section className="simple-project-section" aria-labelledby="project-data-title">
        <h2 id="project-data-title">可用的演示资料</h2>
        <p className="simple-project-section-lead">{outdoor
          ? "切换虚构客户，查看商品、说明书和原始日期为 2023 年的购买记录；商品与订单金额均为人民币模拟数据。"
          : "切换虚构家庭与 2025 年示例月份，核对清洁记录；天气是固定城市样本。"}</p>
        <ul className="simple-project-facts">{facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
        {outdoor && <details id="catalog" className="simple-project-details">
          <summary>查看模拟商品目录 <ChevronDown size={17} aria-hidden="true" /></summary>
          <ul className="simple-project-catalog">{products.map((product) => <li key={product.id}><span>{product.name}</span><small>{product.categoryName} · {formatCny(product.price)}</small></li>)}</ul>
        </details>}
        <p className="simple-project-caveat">{outdoor
          ? "全部角色、商品与购买记录均为公开模拟资料，不代表真实库存或订单。"
          : "角色、使用记录和天气均为模拟资料，不连接真实账户、设备或实时气象。"}</p>
      </section>
      <section id="construction" className="simple-project-section" aria-labelledby="project-build-title">
        <h2 id="project-build-title">如何在 Agent Studio 中构建</h2>
        <div className="simple-project-rows">{construction.map(([title, body]) => <div key={title}><h3>{title}</h3><p>{body}</p></div>)}</div>
        <p className="simple-project-integration">展示站调用已发布的 Agent，呈现流式回答、资料引用与公开工具过程。</p>
        <details className="simple-project-details">
          <summary>查看 {tools.length} 个工具与接入接口 <ChevronDown size={17} aria-hidden="true" /></summary>
          <div className="simple-project-tool-content">
            <div className="simple-project-endpoints"><span>HTTP <code>{base}/tools/&#123;tool&#125;</code></span><span>MCP <code>{base}/mcp</code></span><a href={`${base}/openapi`} target="_blank" rel="noreferrer">OpenAPI <ArrowUpRight size={14} /></a></div>
            <dl>{tools.map(([name, body]) => <div key={name}><dt><code>{name}</code></dt><dd>{body}</dd></div>)}</dl>
          </div>
        </details>
        <p className="project-source-note">案例参考：<a href={project.href} target="_blank" rel="noreferrer">{outdoor ? "Microsoft Contoso Chat" : "LangChain ReAct Agent"} ↗</a>。界面与组件来源见 <Link href="/credits">开源致谢</Link>。</p>
      </section>
      <div className="simple-project-end"><Link href={`/chat/${demo.slug}`} className="primary-button">开始体验 {demo.name} <ArrowRight size={16} /></Link><Link href="/platform" className="secondary-button">平台技术实现 <ArrowUpRight size={16} /></Link></div>
    </div>
  </>;
}
