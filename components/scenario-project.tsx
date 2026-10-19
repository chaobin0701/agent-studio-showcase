import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { projects, demosForProject } from "@/lib/catalog";
import { products, customers } from "@/lib/contoso/service";
import { profiles, months } from "@/lib/robot/service";
import records from "@/data/robot-records.json";
import { contosoTools, robotTools } from "@/lib/project-content";

type Project = (typeof projects)[number];
export function ScenarioProject({ project }: { project: Project }) {
  const outdoor = project.slug === "contoso-outdoor";
  const demo = demosForProject(project.slug)[0];
  const tools = outdoor ? contosoTools : robotTools;
  const stats = outdoor ? [[products.length, "件中文商品"], [products.length, "份中文说明书"], [customers.length, "位模拟客户"], [customers.reduce((n, c) => n + c.orders.length, 0), "笔模拟购买记录"]] : [[profiles.length, "个模拟家庭"], [months.length, "个示例月份"], [records.length, "条使用记录"], [3, "座模拟天气城市"]];
  const flow = outdoor ? [
    ["选择一个模拟角色", "页面选择张晨、李悦等虚构客户。角色和访客身份共同决定会话范围，购买记录可在聊天里的角色面板核对。"],
    ["按条件调用商品工具", "Agent 将预算、人数与商品 ID 传给工具。Node.js 服务确定性筛选和计算；没有匹配项时直接返回空结果。"],
    ["检索中文商品说明书", "搭建、使用与保养问题交给 Agent Studio 知识库。商品工具提供规格，说明书检索提供操作依据与引用。"],
    ["流式返回可核对的回答", "React 聊天端展示答案、引用与公开工具过程。工具结果和页面资料使用同一套领域数据与人民币模拟价格。"],
  ] : [
    ["选择家庭和月份", "使用公开虚构角色与 2025 年示例记录，切换城市背景、家庭情况和月份，比较不同场景。"],
    ["按问题获取资料", "使用方法与故障排查检索知识资料；清洁报告读取月度效率、耗材与对比数据。"],
    ["通过工具连接家庭数据", "Node.js 服务提供角色、城市、月份和清洁记录，天气为固定样本，不接入实时气象或真实设备。"],
    ["在一段对话中继续追问", "同一个助手按问题选择知识或工具能力；界面展示公开过程，角色面板提供可对照的原始示例。"],
  ];
  const base = outdoor ? "/api/contoso" : "/api";
  return <>
    <section className="scenario-project-hero"><div className="site-container">
      <Link href="/projects" className="project-back"><ArrowLeft size={14} />全部项目</Link>
      <div className="scenario-intro">
        <div><p className="section-kicker">{outdoor ? "零售咨询 × 知识检索 × 工具调用" : "家庭清洁 × 数据报告 × 工具调用"}</p>
          <h1>{demo.name}</h1>
          <p className="project-lead">{outdoor ? "把商品、说明书与购买记录，变成有依据的装备建议。" : "让使用说明、家庭记录与模拟天气，一起回答清洁问题。"}</p>
          <div className="project-hero-actions"><Link href={`/chat/${demo.slug}`} className="primary-button">立即开始体验 <ArrowRight size={16} /></Link><a href={project.href} target="_blank" rel="noreferrer" className="secondary-button">参考项目 <ArrowUpRight size={15} /></a></div>
        </div>
        <div className="scenario-intro-note"><span>{outdoor ? "CONTOSO OUTDOOR" : "ROBOT ASSISTANT"}</span><p>{outdoor ? "独立的 Node.js 领域服务负责业务数据；Agent Studio 负责知识检索与 Agent 执行。" : "独立的 Node.js 服务提供模拟家庭与设备数据；Agent Studio 负责知识与对话执行。"}</p><small>Next.js · React · TypeScript · HTTP / MCP</small></div>
      </div>
    </div></section>
    <nav className="project-section-nav" aria-label={`${demo.name}项目目录`}><div className="site-container">
      <div><a href="#flow">工作原理</a><a href="#data">数据与角色</a><a href="#tools">Tool / MCP</a><a href="#implementation">技术实现</a></div>
      <Link href={`/chat/${demo.slug}`} className="project-nav-action">开始聊天 <ArrowRight size={14} /></Link>
    </div></nav>
    <div className="site-container project-story">
      <section id="flow" className="project-story-section"><div className="scenario-section-layout">
        <div className="project-section-heading"><p className="section-kicker">01 / WORKFLOW</p><h2>{outdoor ? "从一个问题，到一条装备建议。" : "先查资料，再结合家庭情况。"}</h2><p>{outdoor ? "一套对话界面，串起确定性的商品查询与有来源的说明书检索。" : "知识问答、清洁报告和天气建议共用一个助手，按问题选择所需能力。"}</p></div>
        <ol className="scenario-flow">{flow.map(([title, body], i) => <li key={title}><span>0{i + 1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol>
      </div></section>
      <section id="data" className="project-story-section">
        <div className="project-section-heading"><p className="section-kicker">02 / DATA & PERSONAS</p><h2>{outdoor ? "模拟角色，真实的数据关联。" : "每个模拟家庭，都有可核对的记录。"}</h2></div>
        <dl className="scenario-data-counts">{stats.map(([count, label]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
        <div className="scenario-data-copy"><p>{outdoor ? "以微软 Contoso Chat 公开样例为来源，保留稳定的商品、客户与订单 ID。中文名称、描述、规格和说明书使用独立覆盖层，保留英文原始资料与第三方许可。" : "参考 LangChain ReAct Agent 的公开清洁数据，角色使用中文虚构姓名。家庭情况、使用效率、耗材与历史对比来自示例记录；深圳、合肥、杭州的天气为固定模拟样本。"}</p>
          <p>{outdoor ? "12 位客户可在角色面板切换。商品采用独立人民币模拟价格，32 笔购买记录按“数量 × 单价”重算，保留原始 2023 年日期；没有真实库存、物流或会员折扣。" : "可选择不同家庭与 2025 年月份，查看同一用户的清洁差异。这里没有真实账户、设备连接或实时天气；对话始终标注数据的模拟性质。"}</p></div>
        <Link href={`/demos/${demo.slug}`} className="project-inline-link">查看完整示例资料 <ArrowUpRight size={15} /></Link>
      </section>
      <section id="tools" className="project-story-section">
        <div className="project-section-heading"><p className="section-kicker">03 / TOOLS & MCP</p><h2>同一套服务，两种接入方式。</h2><p>HTTP 工具与 MCP 共用领域函数和 Zod 入参校验，返回一致的业务结果。Agent 负责理解问题，工具负责查询和计算。</p></div>
        <div className="scenario-endpoints"><div><span>HTTP</span><code>{base}/tools/&#123;tool&#125;</code></div><div><span>MCP</span><code>{base}/mcp</code></div><a href={`${base}/openapi`} target="_blank" rel="noreferrer">OpenAPI 文档 <ArrowUpRight size={14} /></a></div>
        <dl className="scenario-tool-list">{tools.map(([name, body]) => <div key={name}><dt><code>{name}</code></dt><dd>{body}</dd></div>)}</dl>
        <p className="project-source-note">{outdoor ? "六个领域工具提供商品与购买记录；说明书通过 Agent Studio 的知识检索能力获取。模拟客户 ID 只表示公开角色，不代表登录身份。" : "七个领域工具提供家庭与月度数据；知识问答使用 Agent Studio 的知识检索能力。角色不是登录身份，固定天气样本不是实时观测。"}</p>
      </section>
      <section id="implementation" className="project-story-section">
        <div className="project-section-heading"><p className="section-kicker">04 / IMPLEMENTATION</p><h2>展示站与 Agent 平台，保持独立。</h2></div>
        <dl className="project-stack">
          <div><dt>前端交互</dt><dd><strong>Next.js · React · Zola / prompt-kit</strong><p>GPT 风格的流式聊天、推荐问题、角色资料、会话恢复与引用展示。</p></dd></div>
          <div><dt>业务服务</dt><dd><strong>Node.js · TypeScript · Zod · MCP SDK</strong><p>{outdoor ? "商品检索、规格比较与订单汇总共享中文数据层，预算单位统一为人民币。" : "公开角色、使用记录、天气与报告上下文由领域服务提供。"}</p></dd></div>
          <div><dt>会话与传输</dt><dd><strong>SQLite · 签名访客 Cookie · Fetch / SSE</strong><p>会话按访客、体验和角色归属隔离；请求幂等恢复，断开接收不代表执行已取消。</p></dd></div>
          <div><dt>Agent 接入</dt><dd><strong>Agent Studio API · HTTP / MCP · 知识库</strong><p>平台管理已发布 Agent、Prompt、模型与知识索引；展示站不复制权限、版本或执行内核。</p></dd></div>
        </dl>
        <p className="project-source-note">案例来源：<a href={project.href} target="_blank" rel="noreferrer">{outdoor ? "Microsoft Contoso Chat" : "LangChain ReAct Agent"} ↗</a>。界面与组件来源见 <Link href="/credits">开源致谢</Link>。</p>
      </section>
    </div>
  </>;
}
