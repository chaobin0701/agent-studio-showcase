import Link from "next/link";
import { Activity, ArrowLeft, ArrowUpRight, Database, Play, Rocket, Settings2, SlidersHorizontal, Workflow } from "lucide-react";
import { platformStack } from "@/lib/project-content";

const architecture = [
  ["接入与配置", "管理界面负责配置和发布 Agent、模型、Prompt、Skill、知识库与工具；聊天端和外部应用通过 API 使用已发布能力。", SlidersHorizontal],
  ["发布与执行", "NestJS 服务校验身份、工作区权限和预算，固定 Agent 与依赖版本；Deep Agents 组织模型推理、检索、工具调用和成员委派。", Workflow],
  ["数据与外部能力", "PostgreSQL 保存资源、运行记录与检索索引，pg-boss Worker 异步处理文档；业务数据由独立服务经 HTTP Tool 或 MCP 提供。", Database],
] as const;

const lifecycle = [
  ["配置", "在工作区组合模型方案、Prompt、Skill、知识库、工具和成员 Agent。", Settings2],
  ["发布", "调试草稿并发布固定版本，形成包含依赖与授权的执行快照。", Rocket],
  ["执行", "请求通过身份与预算检查后，Deep Agents 按任务选择检索、工具或成员 Agent。", Play],
  ["追踪", "JSON 或 SSE 返回答案、引用与公开过程；Run、用量和调用记录可回查。", Activity],
] as const;

const highlights = [
  ["通用 Agent 平台", "在工作区统一管理 Agent、模型方案、Prompt、Skill、Tool 和知识库，通过聊天或独立任务接口接入不同应用；业务数据由外部服务提供。"],
  ["ReAct 式执行链", "基于 Deep Agents、LangChain 和 LangGraph 完成模型决策、工具调用、结果反馈与继续推理。Chat 和 Run 共用执行服务，平台在执行前固定授权和预算。"],
  ["RAG 知识库闭环", "Worker 异步解析、分块并索引文档；支持 PostgreSQL 全文检索、pgvector 向量检索与 RRF 混合召回，回答保留引用和索引版本。"],
  ["可复用 Skill", "已发布的 Skill 指导与辅助资料作为只读虚拟文件绑定 Agent，运行时按需读取；Skill 版本进入任务快照，不会因此扩大工具权限。"],
  ["HTTP / MCP 工具接入", "HTTP Tool 与远程 Streamable HTTP MCP 经过契约发现、测试、发布和 Agent 授权；执行时校验参数、凭据、网络边界与调用预算。"],
  ["多 Agent 协作", "入口 Agent 可以委派给已授权的成员。成员使用各自发布的模型、Prompt 和能力，共享执行次数、Token 与期限预算。"],
  ["不可变发布快照", "草稿可持续编辑；发布后固定 Agent 与依赖版本。每次请求读取生效快照，历史版本、引用和运行记录可追溯。"],
  ["接入与运行治理", "后台调试、访客聊天、应用 API 和独立 Run 共用工作区权限与记录；PostgreSQL RLS 隔离数据，支持 SSE、用量统计及可选的本地 Phoenix 追踪。"],
] as const;

export function PlatformSections() {
  return <>
    <section className="platform-page-hero"><div className="site-container">
      <Link href="/" className="project-back"><ArrowLeft size={14} />返回首页</Link>
      <p className="section-kicker">AGENT STUDIO · 技术实现</p>
      <h1>Agent Studio 的技术实现。</h1>
      <p>Agent Studio 基于 LangChain、LangGraph 与 Deep Agents。平台负责配置、授权、版本和执行；业务系统通过 HTTP / MCP 提供自己的数据与能力。</p>
      <a href="https://github.com/chaobin0701/agent-studio" target="_blank" rel="noopener noreferrer" className="platform-source-link">查看源码与 README <ArrowUpRight size={16} /></a>
    </div></section>
    <div className="site-container platform-page-content">
      <section className="platform-page-section" aria-labelledby="architecture-title">
        <div className="platform-section-intro"><h2 id="architecture-title">系统由哪些部分组成</h2><p>一套控制面、一套执行服务，加上独立的数据与外部能力接入。</p></div>
        <dl className="platform-capability-rows">{architecture.map(([name, body, Icon]) => <div key={name}><dt><Icon className="platform-item-icon" size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" />{name}</dt><dd>{body}</dd></div>)}</dl>
      </section>
      <section className="platform-page-section" aria-labelledby="workflow-title">
        <div className="platform-section-intro"><h2 id="workflow-title">一次请求的完整路径</h2><p>发布版本和授权在执行前固定，模型只使用本次任务允许的资源。</p></div>
        <ol className="platform-timeline">{lifecycle.map(([name, body, Icon]) => <li key={name}><h3><Icon className="platform-item-icon" size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" />{name}</h3><p>{body}</p></li>)}</ol>
      </section>
      <section className="platform-page-section" aria-labelledby="highlights-title">
        <div className="platform-section-intro"><h2 id="highlights-title">项目亮点</h2><p>从 README 提炼的核心能力，以及它们在平台中的实现方式。</p></div>
        <div className="platform-stack-table-wrap"><table className="platform-stack-table platform-highlights-table"><thead><tr><th scope="col">核心亮点</th><th scope="col">实现说明</th></tr></thead><tbody>{highlights.map(([name, body]) => <tr key={name}><th scope="row">{name}</th><td>{body}</td></tr>)}</tbody></table></div>
      </section>
      <section className="platform-page-section" aria-labelledby="stack-title">
        <div className="platform-section-intro"><h2 id="stack-title">技术栈与职责</h2><p>下表只列 Agent Studio 平台自身的技术；Agent Studio Showcase 是独立的 Next.js 展示项目。</p></div>
        <div className="platform-stack-table-wrap"><table className="platform-stack-table"><thead><tr><th scope="col">层级</th><th scope="col">主要技术</th><th scope="col">职责</th></tr></thead><tbody>{platformStack.map(([name, tech, body]) => <tr key={name}><th scope="row">{name}</th><td>{tech}</td><td>{body}</td></tr>)}</tbody></table></div>
      </section>
      <div className="platform-page-end"><p>想看看这些能力如何用于实际应用？</p><Link href="/projects" className="primary-button">浏览应用 <ArrowUpRight size={16} /></Link></div>
    </div>
  </>;
}
