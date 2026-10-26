"use client";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, ChevronRight, Clock3, Eye, FileText, History, LockKeyhole, MessageSquare, Search, X } from "lucide-react";
import type { DisplaySnapshot, PreviewConversation, ResourceSummary } from "@/lib/conversation-info/types";
import { formatCount, formatReset } from "@/lib/conversation-info/quota";
import { CapabilityCounts } from "./quota-panel";
import styles from "./conversation-info.module.css";

function Names({ items }: { items: ResourceSummary[] }) {
  return <ul className={styles.resourceList}>{items.map(item => <li key={`${item.name}:${item.version}`}><span>{item.name}</span><small>{item.version}</small></li>)}</ul>;
}
function SnapshotDetails({ snapshot }: { snapshot: DisplaySnapshot }) {
  const policy = snapshot.application.policy;
  return <>
    <div className={styles.snapshotHero}><div><p>{snapshot.kind === "recorded-turn" ? "本轮实际使用" : "当前生效配置预览"}</p><h3>{snapshot.agent.name} <span>{snapshot.agent.version}</span></h3></div><span className={styles.recordBadge}>{snapshot.kind === "recorded-turn" ? <><Check size={12} />已固化</> : <><Eye size={12} />非历史快照</>}</span></div>
    <CapabilityCounts snapshot={snapshot} />
    <div className={styles.snapshotGrid}>
      <section className={styles.snapshotBlock}><h4>模型与 Prompt</h4><dl className={styles.detailRows}><div><dt>模型方案</dt><dd>{snapshot.modelPlan.name} <small>{snapshot.modelPlan.version}</small></dd></div><div><dt>Prompt 版本</dt><dd>{snapshot.prompt.name} <small>{snapshot.prompt.version}</small></dd></div><div><dt>输出方式</dt><dd>{snapshot.output}</dd></div></dl></section>
      <section className={styles.snapshotBlock}><h4>单轮对话预算</h4><dl className={styles.detailRows}><div><dt>模型调用</dt><dd>{snapshot.budgets.modelCalls === undefined ? "未启用" : `${snapshot.budgets.modelCalls} 次`}</dd></div><div><dt>工具调用</dt><dd>{snapshot.budgets.toolCalls === undefined ? "未启用" : `${snapshot.budgets.toolCalls} 次`}</dd></div><div><dt>累计 Token</dt><dd>{snapshot.budgets.tokens === undefined ? "未启用" : `${formatCount(snapshot.budgets.tokens)} Token`}</dd></div></dl></section>
      <section className={styles.snapshotBlock}><h4>Tools / 工具</h4><Names items={snapshot.tools} /><h4 className={styles.subheading}>Skills</h4><Names items={snapshot.skills} /></section>
      <section className={styles.snapshotBlock}><h4>MCP 服务</h4><Names items={snapshot.mcp.map(item => ({ ...item, name: `${item.name} · ${item.toolCount} 个工具` }))} /><h4 className={styles.subheading}>协作方式</h4><p className={styles.modeLabel}>{snapshot.collaboration.mode === "single" ? "单 Agent" : "多 Agent 协作"}</p>{snapshot.collaboration.members.length > 0 && <Names items={snapshot.collaboration.members} />}</section>
      <section className={styles.snapshotBlock}><h4><BookOpen size={14} />知识库与检索</h4><Names items={snapshot.knowledge} /><p className={styles.retrieval}>{snapshot.retrieval.mode} · Top {snapshot.retrieval.topK} · 上下文 {formatCount(snapshot.retrieval.contextChars)} 字{snapshot.retrieval.similarity !== undefined ? ` · 相似度 ${snapshot.retrieval.similarity}` : ""}</p></section>
      <section className={styles.snapshotBlock}><h4>本轮适用应用额度</h4><dl className={styles.detailRows}><div><dt>每日请求</dt><dd>{policy.dailyRequests === undefined ? "未启用" : `${policy.dailyRequests} 次`}</dd></div><div><dt>每日 Token</dt><dd>{policy.dailyTokens === undefined ? "未启用" : `${formatCount(policy.dailyTokens)} Token`}</dd></div><div><dt>每分钟请求</dt><dd>{policy.requestsPerMinute === undefined ? "未启用" : `${policy.requestsPerMinute} 次 / 60 秒`}</dd></div></dl><p className={styles.policyHint}>请求开始时的限额设置，不是当前剩余额度。</p></section>
    </div>
    <div className={styles.snapshotMetadata}><Clock3 size={12} />{snapshot.kind === "recorded-turn" ? "记录于" : "预览于"} {formatReset(snapshot.capturedAt, true)} · 上海时间{snapshot.runId && <code>{snapshot.runId}</code>}</div>
  </>;
}
export function SnapshotDialog({ conversations, currentPreview, onClose }: { conversations: PreviewConversation[]; currentPreview: DisplaySnapshot; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [conversationId, setConversationId] = useState(conversations[0]?.id ?? "");
  const [turnIndex, setTurnIndex] = useState(Math.max(0, (conversations[0]?.turns.length ?? 1) - 1));
  const [preview, setPreview] = useState(false);
  const [search, setSearch] = useState("");
  const conversation = conversations.find(item => item.id === conversationId) ?? conversations[0];
  const turn = conversation?.turns[turnIndex];
  const snapshot = preview ? currentPreview : turn?.state === "completed" ? turn.snapshot : undefined;
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={dialog} className={styles.snapshotDialog} aria-labelledby="snapshot-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <div className={styles.dialogHeading}><div><div className={styles.dialogTitle}><History size={19} /><h2 id="snapshot-title">对话配置快照</h2><span className={styles.mockLabel}>只读</span></div><p>查看每轮请求开始时的配置摘要，历史记录不会随新版本改变。</p></div><button type="button" className={styles.iconButton} aria-label="关闭配置快照" onClick={onClose}><X size={19} /></button></div>
    <div className={styles.dialogLayout}>
      <nav className={styles.conversationNav} aria-label="对话列表"><label className={styles.search}><Search size={14} /><input aria-label="搜索对话" value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索对话" /></label><p className={styles.navCaption}>对话记录</p>{conversations.filter(item => item.title.includes(search)).map(item => <button type="button" key={item.id} aria-pressed={conversation?.id === item.id && !preview} className={styles.conversationItem} onClick={() => { setConversationId(item.id); setTurnIndex(Math.max(0, item.turns.length - 1)); setPreview(false); }}><MessageSquare size={14} /><span><strong>{item.title}</strong><small>{item.date} · {item.turns.length} 轮</small></span></button>)}
        <button type="button" className={styles.currentPreviewLink} aria-pressed={preview} onClick={() => setPreview(true)}><Eye size={14} />当前生效配置预览</button>
      </nav>
      <div className={styles.dialogMain}>
        <div className={styles.breadcrumb}><MessageSquare size={13} />{preview ? "当前配置" : conversation?.title}<ChevronRight size={12} /><span>{preview ? "预览" : `第 ${(turn?.number ?? 1)} 轮`}</span></div>
        {!preview && <div className={styles.turnTabs} role="tablist" aria-label="选择对话轮次">{conversation?.turns.map((item, index) => <button type="button" role="tab" key={item.id} aria-selected={index === turnIndex} aria-controls="snapshot-content" onClick={() => setTurnIndex(index)}>第 {item.number} 轮 <small>{item.state === "recording" ? "记录中" : item.snapshot?.agent.version}</small></button>)}</div>}
        <div id="snapshot-content" className={styles.snapshotContent}>
          {!preview && turn && <p className={styles.turnQuestion}><FileText size={13} />{turn.question}</p>}
          {snapshot ? <SnapshotDetails snapshot={snapshot} /> : <div className={styles.pendingSnapshot}><History size={26} /><h3>本轮配置正在记录</h3><p>快照就绪后会显示这一轮的配置。当前生效预览与历史记录分别展示。</p></div>}
        </div>
      </div>
    </div>
    <footer className={styles.dialogFooter}><LockKeyhole size={13} />仅展示名称、数量、版本和限额摘要</footer>
  </dialog>;
}
