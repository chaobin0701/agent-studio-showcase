import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight, Bot, ChevronDown, Tent } from "lucide-react";
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
    ? [[products.length, "件中文商品"], [customers.length, "位模拟客户"], [customers.reduce((n, c) => n + c.orders.length, 0), "笔模拟购买记录"]]
    : [[profiles.length, "个模拟家庭"], [months.length, "个示例月份"], [records.length, "条使用记录"]];
  const story = outdoor ? [
    ["选择模拟客户", "切换张晨、李悦等虚构角色，查看已有购买记录。"],
    ["提出装备需求", "给出预算、人数或已有装备，让顾问比较符合条件的商品。"],
    ["追问使用方法", "继续询问搭建、使用和保养，回答引用对应的中文说明书。"],
  ] : [
    ["选择家庭与月份", "切换虚构角色和 2025 年示例月份，对照不同的家庭使用情况。"],
    ["询问使用与故障", "从知识资料中查找使用方法和常见故障的排查步骤。"],
    ["结合记录继续聊", "读取清洁记录形成报告，或结合固定的模拟天气提出扫拖建议。"],
  ];
  const construction = outdoor ? [
    ["提示词与指导", "已发布 Prompt 约束选购、说明书和购买记录的回答范围，指导顾问按需查资料、比较规格并说明依据。"],
    ["知识库", "20 份中文商品说明书建立独立知识索引，使用方法和保养问题可以返回资料引用。"],
    ["工具能力", "商品检索、规格比较和客户购买记录由六个授权工具提供；Agent 按问题选择需要的能力。"],
    ["应用接入", "展示站调用已发布的 Agent，流式呈现回答、引用与公开工具过程。"],
  ] : [
    ["提示词与指导", "已发布 Prompt 指导助手处理知识问答、清洁报告和天气建议，并在需要时查阅资料与模拟记录。"],
    ["知识库", "机器人使用资料进入知识索引，为使用方法和故障排查提供可引用的依据。"],
    ["工具能力", "七个授权工具按需读取模拟家庭、月份、清洁记录和固定天气样本。"],
    ["应用接入", "展示站把选定的角色与月份交给已发布 Agent，并显示回答、引用与公开过程。"],
  ];

  return <>
    <section className="scenario-project-hero"><div className="site-container">
      <Link href="/projects" className="project-back"><ArrowLeft size={14} />全部应用</Link>
      <div className="scenario-intro">
        <div className="scenario-intro-copy">
          <p className="section-kicker">{outdoor ? "户外装备咨询" : "家庭清洁助手"}</p>
          <div className="scenario-title-row"><span className="scenario-title-icon" aria-hidden="true">{outdoor ? <Tent size={29} strokeWidth={1.8} /> : <Bot size={29} strokeWidth={1.8} />}</span><h1>{demo.name}</h1></div>
          <p className="project-lead">{outdoor
            ? "面向露营选购的对话顾问。结合商品规格、中文说明书和模拟购买记录，给出可追问、有出处的推荐。"
            : "面向家庭清洁的对话助手。查使用资料、核对模拟记录，并结合固定天气样本给出清洁建议。"}</p>
          <div className="project-hero-actions"><Link href={"/chat/" + demo.slug} className="primary-button">立即开始体验 <ArrowRight size={16} /></Link></div>
          <div className="scenario-hero-summary">
            <span className="section-kicker">公开演示资料</span>
            <dl>{facts.map(([count, label]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
            <p>{outdoor ? "20 份中文说明书与商品按 ID 对应；订单保留 2023 年原始日期，金额为人民币模拟价格。" : "按模拟家庭和 2025 年示例月份组织记录；天气为固定城市样本，可与对话结果核对。"}</p>
          </div>
        </div>
        <div className="scenario-hero-image"><Image src={outdoor ? "/images/applications/outdoor-camp-ai.png" : "/images/applications/robot-home-ai.png"} alt={outdoor ? "湖畔露营场景中的帐篷和装备" : "客厅木地板上的扫地机器人"} fill sizes="(min-width: 768px) 47vw, 100vw" priority /></div>
      </div>
    </div></section>
    <nav className="project-section-nav" aria-label={demo.name + "内容目录"}><div className="site-container">
      <div><a href="#experience">应用介绍</a><a href="#construction">在 Agent Studio 中构建</a></div>
      <Link href={"/chat/" + demo.slug} className="project-nav-action">开始聊天 <ArrowRight size={14} /></Link>
    </div></nav>
    <div className="site-container project-story">
      <section id="experience" className="project-story-section">
        <div className="project-section-heading">
          <p className="section-kicker">01 / APPLICATION</p>
          <h2>{outdoor ? "从装备需求，到有依据的选择。" : "从使用资料到家庭记录，一段对话接着聊。"}</h2>
          <p>{outdoor ? "选购比较、使用说明和购买记录在同一个顾问中衔接。" : "知识问答、清洁报告与天气建议由同一个助手按问题选择。"}</p>
        </div>
        <div className="scenario-capabilities">{demo.features.map((feature) => <div key={feature.key}><h3>{feature.name}</h3><p>{feature.description}</p></div>)}</div>
        <div className="scenario-evidence">
          <div className="project-section-heading"><h3>{outdoor ? "角色与资料可以对照。" : "每个模拟家庭都有可核对的记录。"}</h3>
            <p>{outdoor ? "中文商品、说明书和订单保持稳定 ID 关联；价格与购买记录均为人民币模拟数据。" : "家庭情况、使用效率、耗材与历史对比来自示例记录；天气是固定样本。"}</p>
          </div>
          <ol className="scenario-story-flow">{story.map(([title, body], index) => <li key={title}><span>0{index + 1}</span><div><h4>{title}</h4><p>{body}</p></div></li>)}</ol>
          <p className="scenario-data-caveat">{outdoor ? "角色、商品与 2023 年购买记录均为公开模拟资料，不代表真实库存或订单。" : "角色、2025 年使用记录和天气均为模拟资料，不连接真实账户、设备或实时气象。"}</p>
          {outdoor && <details id="catalog" className="scenario-catalog">
            <summary>查看 {products.length} 件模拟商品目录 <ChevronDown size={17} aria-hidden="true" /></summary>
            <p>按商品 ID 关联中文说明书；可在聊天中追问使用方法和保养建议。</p>
            <ul>{products.map((product) => <li key={product.id}>
              <span>{product.name}</span><small>{product.categoryName} · {formatCny(product.price)}</small>
            </li>)}</ul>
          </details>}
        </div>
      </section>
      <section id="construction" className="project-story-section">
        <div className="project-section-heading">
          <p className="section-kicker">02 / BUILT IN AGENT STUDIO</p>
          <h2>这个应用如何在 Agent Studio 中构建？</h2>
        </div>
        <ol className="scenario-build-steps">{construction.map(([title, body], index) => <li key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol>
        <details className="scenario-tool-details">
          <summary>查看 {tools.length} 个工具与接入信息 <ChevronDown size={17} aria-hidden="true" /></summary>
          <div className="scenario-tool-content">
            <p>这些能力通过 HTTP Tool 或 MCP 接入，同一份模拟资料用于页面展示和工具回答。</p>
            <div className="scenario-endpoints"><div><span>HTTP</span><code>{base}/tools/&#123;tool&#125;</code></div><div><span>MCP</span><code>{base}/mcp</code></div><a href={base + "/openapi"} target="_blank" rel="noreferrer">查看 OpenAPI <ArrowUpRight size={14} /></a></div>
            <dl className="scenario-tool-list">{tools.map(([name, body]) => <div key={name}><dt><code>{name}</code></dt><dd>{body}</dd></div>)}</dl>
          </div>
        </details>
        <p className="project-source-note">案例参考：<a href={project.href} target="_blank" rel="noreferrer">{outdoor ? "Microsoft Contoso Chat" : "LangChain ReAct Agent"} ↗</a>。界面与组件来源见 <Link href="/credits">开源致谢</Link>。</p>
      </section>
    </div>
  </>;
}
