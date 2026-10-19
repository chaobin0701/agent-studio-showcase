import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { DemoList } from "@/components/demo-list";
import { demosForProject } from "@/lib/catalog";
import { platformOutline, platformStack } from "@/lib/project-content";

export function PlatformProject() {
  return <>
    <section className="platform-project-hero">
      <div className="site-container">
        <Link href="/projects" className="project-back"><ArrowLeft size={14} />全部项目</Link>
        <div className="platform-project-intro">
          <div>
            <p className="section-kicker">通用 Agent 开发与管理平台</p>
            <h1>Agent Studio<span>.</span></h1>
            <h2>从配置资源，到执行真实任务。</h2>
            <p className="project-lead">管理 Agent、Prompt、模型、知识库和工具，把可追溯的执行能力接入自己的应用。</p>
            <div className="project-hero-actions">
              <a href="http://127.0.0.1:8085/" target="_blank" rel="noreferrer" className="primary-button">打开本地后台 <ArrowUpRight size={16} /></a>
              <a href="#applications" className="secondary-button">体验应用 <ArrowRight size={16} /></a>
            </div>
          </div>
          <ol className="platform-lifecycle" aria-label="Agent 生命周期">
            {[["配置", "模型、Prompt、知识与工具"], ["发布", "固定版本与能力授权"], ["执行", "模型决策、检索与调用"], ["追踪", "答案、引用、用量与运行记录"]].map(([title, body], i) => <li key={title}><span>0{i + 1}</span><div><strong>{title}</strong><p>{body}</p></div></li>)}
          </ol>
        </div>
      </div>
    </section>
    <nav className="project-section-nav" aria-label="Agent Studio 项目目录"><div className="site-container">
      <div><a href="#architecture">工作原理</a><a href="#stack">技术栈</a><a href="#outline">项目大纲</a><a href="#applications">应用体验</a></div>
    </div></nav>
    <div className="site-container project-story">
      <section id="architecture" className="project-story-section">
        <div className="project-section-heading"><p className="section-kicker">01 / HOW IT WORKS</p><h2>配置与执行，各司其职。</h2><p>管理端定义资源与权限，执行端读取发布快照，再按需要使用模型、知识和外部服务。</p></div>
        <div className="platform-architecture-layout">
          <a href="/images/studio/architecture-ai-v2.png" target="_blank" rel="noreferrer" aria-label="查看完整平台架构图" className="platform-architecture-image">
            <Image src="/images/studio/architecture-ai-v2.png" width={1448} height={1086}
              sizes="(min-width: 1100px) 700px, (min-width: 768px) 60vw, 100vw"
              alt="Agent Studio 管理端、API、Deep Agents、异步 Worker 与外部能力的分层架构" />
          </a>
          <div className="architecture-notes">
            <div><h3>管理控制面</h3><p>Vue / Vben 后台负责工作区、配置、发布与审计。Agent 引用明确版本的 Prompt、模型和能力。</p></div>
            <div><h3>统一执行服务</h3><p>NestJS 处理准入、快照与预算。Deep Agents 承担通用执行，工具仍经过平台授权与校验。</p></div>
            <div><h3>异步知识处理</h3><p>Worker 通过 pg-boss 消费文档任务，处理分块与索引；在线请求使用可用的索引版本。</p></div>
            <div><h3>独立业务接入</h3><p>聊天端通过 API 获取答案和公开过程。商品、订单、设备记录由外部 HTTP / MCP 服务提供。</p></div>
          </div>
        </div>
      </section>
      <section id="stack" className="project-story-section">
        <div className="project-section-heading"><p className="section-kicker">02 / BUILT WITH</p><h2>一套 TypeScript 工程。</h2><p>通用平台与 React 展示站保持独立，复用接口与协议，不共享数据库或执行内核。</p></div>
        <dl className="project-stack">{platformStack.map(([name, tech, body]) => <div key={name}><dt>{name}</dt><dd><strong>{tech}</strong><p>{body}</p></dd></div>)}</dl>
      </section>
      <section id="outline" className="project-story-section">
        <div className="project-section-heading"><p className="section-kicker">03 / PROJECT OUTLINE</p><h2>项目大纲与实现亮点。</h2><p>从资源管理、执行链路到知识、工具与交付，逐层了解一个通用 Agent 平台。</p></div>
        <div className="project-outline">{platformOutline.map((item, i) => <details key={item.title} open={i === 0}>
          <summary><span className="outline-number">{String(i + 1).padStart(2, "0")}</span><span><strong>{item.title}</strong><small>{item.summary}</small></span><Plus size={18} aria-hidden="true" /></summary>
          <ul>{item.points.map((point) => <li key={point}>{point}</li>)}</ul>
        </details>)}</div>
        <p className="project-source-note">大纲组织参考 <a href="https://liwenzhou.com/courses/ai-agent/" target="_blank" rel="noreferrer">李文周的 AI Agent 项目大纲 ↗</a>，技术与能力说明按本项目源码整理。架构图描述当前源码；本地体验按已发布配置运行，新执行链路的独立部署与全部渠道联调仍在推进。</p>
      </section>
      <section id="applications" className="project-story-section">
        <div className="project-section-heading"><p className="section-kicker">04 / IN PRACTICE</p><h2>用一个场景，体验这套能力。</h2></div>
        <DemoList items={demosForProject("agent-studio")} compact />
      </section>
    </div>
  </>;
}
