import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronDown } from "lucide-react";
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
  const facts = outdoor
    ? [`${products.length} 件中文商品`, `${customers.length} 位模拟客户`, `${customers.reduce((n, c) => n + c.orders.length, 0)} 笔模拟购买记录`, "20 份中文说明书"]
    : [`${profiles.length} 个模拟家庭`, `${months.length} 个示例月份`, `${records.length} 条使用记录`, "固定城市天气样本"];
  const resources = outdoor ? [
    ["商品与购买记录", `包含 ${products.length} 件户外装备的名称、分类、人民币模拟价格与规格，以及 ${customers.length} 位模拟客户的会员资料和购买记录。购买记录保留原始的 2023 年日期，可用于核对已购装备和消费汇总。`],
    ["知识资料", "20 份中文商品说明书按商品 ID 对应到装备，涵盖搭建、使用、清洁与保养。回答使用问题时可检索说明书，并提供资料引用。"],
    ["Tools / 工具", `${contosoTools.length} 项只读工具能力支持商品搜索、单品详情、规格比较、模拟客户列表、客户资料和购买记录查询，可通过 HTTP 或 MCP 接入。`],
    ["可以完成的任务", "按预算、人数和场景筛选装备，比较 2–4 件商品的价格与规格；结合说明书给出使用指导，参考模拟购买记录补齐装备搭配。"],
  ] : [
    ["家庭与使用记录", `${profiles.length} 个虚构家庭包含面积、居住成员、宠物与地面特征。${records.length} 条记录覆盖 2025 年的 ${months.length} 个月份，记录清洁覆盖率、清扫效率、耗材状态和同类家庭对比，可切换家庭与月份核对。`],
    ["知识资料", "机器人使用资料用于知识库检索，支持日常操作、回充与清洁问题排查，以及刷头、滤网等耗材的维护指导；回答可提供资料引用。"],
    ["MCP 服务", `扫地机器人业务以一个 MCP 服务接入，提供 ${robotTools.filter(([name]) => name !== "get_weather").length} 项只读能力：列出模拟家庭、确认家庭身份、查询城市、读取当前与示例月份、读取月度使用记录，以及获取报告栏目与数据边界。天气查询独立配置。`],
    ["独立天气 Tool", "get_weather 查询深圳、合肥、杭州的固定模拟天气，包含天气状况、温度、湿度与降雨概率。它作为独立 HTTP Tool 接入，不包含在 MCP 服务中，也不提供实时气象。"],
    ["可以完成的任务", "根据使用资料回答问题，基于指定家庭与月份生成清洁效率、耗材状态和保养建议报告；结合固定天气样本给出扫拖安排，不对真实设备作诊断。"],
  ];

  return <>
    <section className="simple-project-hero"><div className="site-container">
      <div className="simple-project-hero-grid">
        <div className="simple-project-intro">
          <h1>{demo.name}</h1>
          <p>{demo.detail}</p>
          <dl className="simple-project-capabilities" aria-label="应用功能">{demo.features.map((feature) => <div key={feature.key}><dt>{feature.name}</dt><dd>{feature.description}</dd></div>)}</dl>
          <Link href={`/chat/${demo.slug}`} className="primary-button">开始聊天 <ArrowRight size={16} /></Link>
        </div>
        <div className="simple-project-image"><Image src={outdoor ? "/images/applications/outdoor-camp-ai.png" : "/images/applications/robot-home-ai.png"} alt={outdoor ? "湖畔营地的帐篷和户外装备" : "居家场景中的扫地机器人"} fill sizes="(min-width: 768px) 48vw, 100vw" priority /></div>
      </div>
    </div></section>
    <div className="site-container simple-project-body">
      <section className="simple-project-section" aria-labelledby="project-data-title">
        <h2 id="project-data-title">项目介绍</h2>
        <p className="simple-project-section-lead">{outdoor
          ? "切换虚构客户，查看商品、说明书和原始日期为 2023 年的购买记录；商品与订单金额均为人民币模拟数据。"
          : "切换虚构家庭与 2025 年示例月份，核对清洁记录；天气是固定城市样本。"}</p>
        <ul className="simple-project-facts">{facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
        <dl className="simple-project-rows">{resources.map(([title, body]) => <div key={title}><dt>{title}</dt><dd>{body}</dd></div>)}</dl>
        {outdoor && <details id="catalog" className="simple-project-details">
          <summary>查看模拟商品目录 <ChevronDown size={17} aria-hidden="true" /></summary>
          <ul className="simple-project-catalog">{products.map((product) => <li key={product.id}><span>{product.name}</span><small>{product.categoryName} · {formatCny(product.price)}</small></li>)}</ul>
        </details>}
        <p className="simple-project-caveat">{outdoor
          ? "全部角色、商品与购买记录均为公开模拟资料，不代表真实库存或订单。"
          : "角色、使用记录和天气均为模拟资料，不连接真实账户、设备或实时气象。"}</p>
        <p className="project-source-note">案例参考：<a href={project.href} target="_blank" rel="noreferrer">{outdoor ? "Microsoft Contoso Chat" : "LangChain ReAct Agent"} ↗</a>。界面与组件来源见 <Link href="/credits">开源致谢</Link>。</p>
      </section>
      <div className="simple-project-end"><Link href={`/chat/${demo.slug}`} className="primary-button">开始体验 {demo.name} <ArrowRight size={16} /></Link></div>
    </div>
  </>;
}
