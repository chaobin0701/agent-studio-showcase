import Image from "next/image";
import { ArrowUpRight, Blocks, Cable, Database, GitBranch, PackageCheck, ShieldCheck, UsersRound } from "lucide-react";
import { platformStack } from "@/lib/project-content";

const resources = ["Agent", "模型", "Prompt", "Skill", "知识库", "HTTP Tool", "MCP"];

const capabilities = [
  ["01", "ReAct 式执行链", "Deep Agents 组织模型决策、工具调用与结果反馈。聊天与独立任务共用执行服务，授权与预算在运行前固定。"],
  ["02", "RAG 知识库闭环", "文档由 Worker 异步解析、分块与索引；全文与向量结果可经 RRF 融合，回答保留引用和索引版本。"],
  ["03", "可复用 Skill", "已发布的指导与辅助资料以只读虚拟文件绑定 Agent，运行时按需读取，不会凭文档内容扩大工具权限。"],
  ["04", "HTTP / MCP 工具", "外部能力经过契约发现、测试、发布与 Agent 授权；运行时校验参数、凭据、网络边界与调用预算。"],
  ["05", "多 Agent 协作", "入口 Agent 可以委派给获授权的成员。各成员使用自己的模型、Prompt 与能力，并共享任务预算。"],
  ["06", "不可变发布快照", "草稿可持续编辑；发布后固定 Agent 与依赖版本。一次请求从开始到结束使用同一份生效配置。"],
  ["07", "接入与运行治理", "后台调试、访客聊天、应用 API 和独立 Run 使用同一套工作区权限与记录；支持 SSE、用量统计及可选的本地 Phoenix 追踪。"],
] as const;
const capabilityIcons = [GitBranch, Database, Blocks, Cable, UsersRound, PackageCheck, ShieldCheck] as const;

const lifecycle = [
  ["01", "配置能力", "在工作区组合模型、Prompt、Skill、知识库、工具与成员 Agent。"],
  ["02", "调试并发布", "检查草稿行为，发布 Agent 及依赖版本，形成执行快照。"],
  ["03", "受控执行", "请求先通过身份、权限与预算检查，再由 Deep Agents 按需检索或调用工具。"],
  ["04", "输出与追踪", "通过 JSON 或 SSE 返回答案、引用与公开过程，保留 Run、用量和执行记录。"],
] as const;

export function PlatformNav() {
  return <nav className="project-section-nav home-section-nav" aria-label="首页内容目录">
    <div className="site-container"><div>
      <a href="#demos">应用体验</a>
      <a href="#highlights">核心能力</a>
      <a href="#execution">构建与执行</a>
      <a href="#architecture">系统架构</a>
    </div></div>
  </nav>;
}

export function PlatformSections() {
  return <>
    <div className="site-container project-story platform-home-story">
      <section id="highlights" className="project-story-section">
        <div className="project-section-heading">
          <p className="section-kicker">01 / PLATFORM CAPABILITIES</p>
          <h2>从资源管理，到 Agent 真正完成任务。</h2>
          <p>Agent Studio 将能力配置、版本发布和受控执行放在同一个工作区；业务资料仍由应用与外部服务提供。</p>
        </div>
        <div className="platform-resource-line" aria-label="平台管理的资源">
          <span>在一个工作区管理</span>
          <ul>{resources.map((resource) => <li key={resource}>{resource}</li>)}</ul>
        </div>
        <div className="platform-capability-list">
          {capabilities.map(([number, title, description], index) => {
            const Icon = capabilityIcons[index];
            return <article key={number}>
              <span className="platform-capability-icon"><Icon size={20} strokeWidth={1.8} aria-hidden="true" /></span><div><h3>{title}</h3><p>{description}</p></div>
            </article>;
          })}
        </div>
      </section>
      <section id="execution" className="project-story-section">
        <div className="project-section-heading">
          <p className="section-kicker">02 / FROM DRAFT TO RUN</p>
          <h2>同一套配置，从草稿走到可追溯的执行。</h2>
          <p>版本、权限与预算进入每次任务的边界；模型只能使用当前请求获授权的知识和工具。</p>
        </div>
        <ol className="platform-execution-flow">
          {lifecycle.map(([number, title, description]) => <li key={number}>
            <span>{number}</span><h3>{title}</h3><p>{description}</p>
          </li>)}
        </ol>
        <div className="platform-execution-visual">
          <Image src="/images/studio/execution-ai.png" width={1448} height={1086}
            sizes="(min-width: 1100px) 660px, (min-width: 768px) 55vw, 100vw"
            alt="请求经过鉴权与版本快照，Deep Agents 按授权调用模型、知识检索或 HTTP/MCP 工具，再返回答案与引用" />
          <div><span className="section-kicker">EXECUTION ENGINE</span>
            <h3>Deep Agents 驱动，<br />每一步都有边界。</h3>
            <p>LangChain 提供模型和工具抽象，LangGraph 承载运行。入口 Agent 可以在共同预算内调用知识、工具或委派成员；执行记录保留答案来源与用量。</p>
          </div>
        </div>
      </section>
      <section id="architecture" className="project-story-section">
        <div className="project-section-heading">
          <p className="section-kicker">03 / SYSTEM ARCHITECTURE</p>
          <h2>平台负责执行，业务系统保有自己的数据。</h2>
          <p>后台、聊天端和外部应用通过同一 API 进入平台；领域能力通过 HTTP Tool 或 MCP 接入。</p>
        </div>
        <div className="platform-architecture-layout">
          <a href="/images/studio/architecture-ai-v2.png" target="_blank" rel="noreferrer" aria-label="查看完整平台架构图" className="platform-architecture-image">
            <Image src="/images/studio/architecture-ai-v2.png" width={1448} height={1086}
              sizes="(min-width: 1100px) 700px, (min-width: 768px) 60vw, 100vw"
              alt="管理后台与聊天端经 NestJS API 连接 Deep Agents、异步 Worker、PostgreSQL 和外部 HTTP/MCP 服务" />
          </a>
          <div className="architecture-notes">
            <div><h3>管理控制面</h3><p>Vben 后台管理工作区、权限、资源草稿与发布版本。</p></div>
            <div><h3>统一执行服务</h3><p>NestJS 固定请求快照和预算，由 Deep Agents 组织模型与授权能力。</p></div>
            <div><h3>数据与异步任务</h3><p>PostgreSQL 与 pgvector 保存资源和检索索引；pg-boss Worker 处理文档任务。</p></div>
            <div><h3>应用接入</h3><p>聊天和独立应用使用 API；业务数据通过 HTTP Tool 或 MCP 提供。</p></div>
          </div>
        </div>
        <div className="platform-stack-heading"><h3>技术栈</h3><p>控制面、执行层与数据层的主要技术。</p></div>
        <dl className="project-stack">{platformStack.map(([name, tech, body]) => <div key={name}><dt>{name}</dt><dd><strong>{tech}</strong><p>{body}</p></dd></div>)}</dl>
        <a className="project-inline-link" href="https://github.com/chaobin0701/agent-studio" target="_blank" rel="noopener noreferrer">查看项目源码与 README <ArrowUpRight size={15} /></a>
      </section>
    </div>
  </>;
}
