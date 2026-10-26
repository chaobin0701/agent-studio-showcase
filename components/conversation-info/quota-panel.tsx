"use client";
import { useState } from "react";
import { AlertCircle, Blocks, BookOpen, ChevronRight, Clock3, Layers3, SlidersHorizontal, Wrench, X } from "lucide-react";
import type { ConfigurationTurn, DisplaySnapshot, Meter, SharedQuota } from "@/lib/conversation-info/types";
import { formatCount, quotaNotice } from "@/lib/conversation-info/quota";
import styles from "./conversation-info.module.css";

function QuotaMeter({ label, value, reserved = 0, hint }: { label: string; value: Meter; reserved?: number; hint?: string | null }) {
  const percent = Math.min(100, value.used / value.limit * 100);
  const reservedPercent = Math.min(100 - percent, reserved / value.limit * 100);
  return <div className={styles.meter}>
    <div className={styles.meterLabel}><span>{label}</span><span><strong>{formatCount(value.used)}</strong><em> / {formatCount(value.limit)}</em></span></div>
    <div className={styles.track} role="progressbar" aria-label={`${label}使用量`} aria-valuemin={0} aria-valuemax={value.limit} aria-valuenow={Math.min(value.limit, value.used + reserved)} aria-valuetext={`已用 ${value.used}，预留 ${reserved}，剩余 ${value.remaining}`}>
      <span className={styles.used} style={{ width: `${percent}%` }} /><span className={styles.reserved} style={{ width: `${reservedPercent}%` }} />
    </div>
    {(hint !== null || reserved > 0) && <div className={styles.meterFoot}>{hint !== null && <span>{hint ?? `剩余 ${formatCount(value.remaining)}${label.includes("Token") ? " Token" : " 次"}`}</span>}{reserved > 0 && <span>预留 {formatCount(reserved)}</span>}</div>}
  </div>;
}
export function CapabilityCounts({ snapshot }: { snapshot: DisplaySnapshot }) {
  return <div className={styles.capabilities}>
    <span><Wrench size={15} />Tools <b>{snapshot.tools.length}</b></span>
    <span><Blocks size={15} />Skills <b>{snapshot.skills.length}</b></span>
    <span><Layers3 size={15} />MCP <b>{snapshot.mcp.length}</b></span>
  </div>;
}
export function QuotaContent({ quota }: { quota: SharedQuota }) {
  const notice = quotaNotice(quota);
  const configured = Boolean(quota.requests || quota.tokens || quota.minute);
  return <section className={`${styles.quotaSection} ${styles[notice.level]}`} aria-label="共享额度">
    <div className={styles.sectionTitle}><div className={styles.quotaTitle}><h3>共享额度</h3><details className={styles.quotaHint}><summary aria-label="共享额度说明"><AlertCircle size={14} /></summary><p>本展示站所有访客共同使用</p></details></div>{(quota.requests || quota.tokens) && <span><Clock3 size={12} />每日 00:00 重置</span>}</div>
    {quota.requests && <QuotaMeter label="今日请求" value={quota.requests} />}
    {quota.tokens && <QuotaMeter label="今日 Token" value={quota.tokens} reserved={quota.tokens.reserved} hint={null} />}
    {quota.minute && <QuotaMeter label="每分钟请求" value={quota.minute} hint={`滚动 60 秒 · 剩余 ${quota.minute.remaining} 次`} />}
    {!configured && <div className={styles.unconfigured}>未启用每日或分钟共享限额。<br />模型上下文容量与服务端保护仍独立生效。</div>}
    <div className={styles.quotaNotice} role={notice.blocked ? "alert" : "status"}><AlertCircle size={16} /><div><strong>{notice.title}</strong>{notice.level !== "neutral" && <p>{notice.detail}</p>}</div></div>
  </section>;
}
export function ShowcaseInfoPanel({ quota, turns, configurationError, contextWindowTokens, onClose }: { quota: SharedQuota | null; turns: ConfigurationTurn[]; configurationError?: string; contextWindowTokens?: number; onClose: () => void }) {
  const configuration = turns.at(-1)?.snapshot;
  const [configurationExpanded, setConfigurationExpanded] = useState(false);
  const configurationGroups = configuration ? [
    { label: "知识库", items: configuration.knowledge, Icon: BookOpen },
    { label: "Skills", items: configuration.skills, Icon: Blocks },
    { label: "Tools", items: configuration.tools, Icon: Wrench },
    { label: "MCP 服务", items: configuration.mcp, Icon: Layers3 },
  ] : [];
  return <aside id="showcase-information" role="dialog" tabIndex={-1} aria-label="展示站信息" aria-modal="false" className={styles.infoPanel}>
    <button type="button" className={`${styles.iconButton} ${styles.panelClose}`} aria-label="关闭展示站信息" onClick={onClose}><X size={16} /></button>
    {quota ? <QuotaContent quota={quota} /> : <section className={styles.quotaSection}><h3>共享额度</h3><p className={styles.unconfigured}>暂未获取到可展示的额度，请稍后刷新。</p></section>}
    <section className={styles.agentCounts} aria-label="Agent 配置">
      <div className={`${styles.sectionTitle} ${styles.agentHeading}`}><h3><button type="button" className={styles.configurationToggle} disabled={!configuration} aria-expanded={configurationExpanded} aria-controls="agent-configuration-content" onClick={() => setConfigurationExpanded(value => !value)}>Agent 配置<ChevronRight size={13} className={configurationExpanded ? styles.expandedChevron : undefined} /></button></h3>{configuration && <span className={styles.agentName} title={`${configuration.agent.name} · ${configuration.agent.version}`}>{configuration.agent.name} · {configuration.agent.version}</span>}</div>
      <div id="agent-configuration-content">
        {configuration ? configurationExpanded ? <div className={styles.configurationDetails}>
          {configurationGroups.map(({ label, items, Icon }) => <div key={label}><strong><Icon size={14} aria-hidden="true" />{label}</strong>{items.length ? items.map(item => <p key={`${item.name}:${item.version}`}>{item.name}<span>{item.version}</span></p>) : <p>未配置</p>}</div>)}
        </div> : <dl className={styles.countGrid}>
          {configurationGroups.map(({ label, items, Icon }) => <div key={label}><dt><Icon size={14} aria-hidden="true" />{label}</dt><dd>{items.length}</dd></div>)}
        </dl> : <p className={styles.unconfigured}>{configurationError || "当前会话暂无 Agent 配置快照"}</p>}
        <dl className={`${styles.contextWindow} ${configurationExpanded && configuration ? styles.contextWindowDetailed : ""}`}><div><dt><SlidersHorizontal size={14} />上下文窗口</dt><dd>{contextWindowTokens ? `${formatCount(contextWindowTokens)} Token` : "等待测量"}</dd></div></dl>
      </div>
    </section>
  </aside>;
}
