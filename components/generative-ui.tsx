"use client";

import { Component, type ReactNode } from "react";
import { renderGenerativeUI, type GenerativeUILibrary } from "@assistant-ui/generative-ui/react";
import { definitions } from "@/lib/generative-ui/definitions";
import { supportedBlock } from "@/lib/generative-ui/catalogs";
import type { UiBlock } from "@/lib/generative-ui/blocks";
import { UiMarkdown, UiAlert, UiImage, UiGallery, UiBadge, UiTag, UiKeyValue, UiSteps, UiTimeline, UiAccordion, UiTabs, UiList } from "./generative-ui-content";
import { UiActionButton, UiChoice, UiForm, UiConfirmation, UiActionProvider, type UiActionHost } from "./generative-ui-actions";

type Point = { label: string; value: number };
function Chart({ title, chartType, points, unit = "" }: { title: string; chartType: "bar" | "line"; points: Point[]; unit?: string }) {
  const min = Math.min(0, ...points.map(point => point.value));
  const max = Math.max(0, ...points.map(point => point.value));
  const range = max - min || 1;
  const y = (value: number) => 20 + (max - value) / range * 140;
  const width = 520 / points.length;
  const x = (index: number) => 40 + width * (index + 0.5);
  return <figure className="min-w-0 space-y-3">
    <figcaption className="text-sm font-medium">{title}{unit ? `（${unit}）` : ""}</figcaption>
    <svg viewBox="0 0 600 205" role="img" aria-label={`${title}，${chartType === "bar" ? "柱状图" : "折线图"}`} className="w-full">
      <line x1="40" x2="560" y1={y(0)} y2={y(0)} stroke="currentColor" opacity="0.2" />
      {chartType === "line" && <polyline points={points.map((point, i) => `${x(i)},${y(point.value)}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" />}
      {points.map((point, i) => <g key={i}>
        <title>{`${point.label}: ${point.value}${unit}`}</title>
        {chartType === "bar" ? <rect x={x(i) - width * 0.3} y={Math.min(y(0), y(point.value))} width={width * 0.6} height={Math.max(1, Math.abs(y(point.value) - y(0)))} rx="3" fill="currentColor" opacity="0.65" /> : <circle cx={x(i)} cy={y(point.value)} r="3" fill="currentColor" />}
        {(points.length <= 10 || i % Math.ceil(points.length / 10) === 0) && <text x={x(i)} y="190" textAnchor="middle" fontSize="10" fill="currentColor">{point.label.slice(0, 8)}</text>}
      </g>)}
    </svg>
    <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">查看图表数据</summary><ul className="mt-2 space-y-1">{points.map((point, i) => <li key={i}>{point.label}：{point.value}{unit}</li>)}</ul></details>
  </figure>;
}

const library = {
  Card: { ...definitions.Card, render: ({ title, description, children }) => <section className="min-w-0 rounded-xl border border-border bg-background p-4 shadow-sm"><h3 className="font-semibold">{title}</h3>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}<div className="mt-3 space-y-4">{children}</div></section> },
  Row: { ...definitions.Row, render: ({ children }) => <div className="flex flex-wrap gap-4 [&>*]:min-w-0 [&>*]:flex-1">{children}</div> },
  Fact: { ...definitions.Fact, render: ({ label, value, detail }) => <div className="min-w-28 rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-xl font-semibold">{value}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div> },
  Chart: { ...definitions.Chart, render: props => <Chart {...props} /> },
  Table: { ...definitions.Table, render: ({ caption, columns, rows }) => <div className="max-w-full overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><caption className="mb-2 text-left font-medium">{caption}</caption><thead><tr>{columns.map((column: string, i: number) => <th key={i} className="border-b border-border px-3 py-2 font-medium">{column}</th>)}</tr></thead><tbody>{rows.map((row: (string | number)[], i: number) => <tr key={i}>{columns.map((_: string, j: number) => <td key={j} className="border-b border-border px-3 py-2">{row[j] ?? ""}</td>)}</tr>)}</tbody></table></div> },
  Markdown: { ...definitions.Markdown, render: props => <UiMarkdown {...props} /> },
  Alert: { ...definitions.Alert, render: props => <UiAlert {...props} /> },
  Image: { ...definitions.Image, render: props => <UiImage {...props} /> },
  Gallery: { ...definitions.Gallery, render: props => <UiGallery {...props} /> },
  Badge: { ...definitions.Badge, render: props => <UiBadge {...props} /> },
  Tag: { ...definitions.Tag, render: props => <UiTag {...props} /> },
  KeyValue: { ...definitions.KeyValue, render: props => <UiKeyValue {...props} /> },
  Steps: { ...definitions.Steps, render: props => <UiSteps {...props} /> },
  Timeline: { ...definitions.Timeline, render: props => <UiTimeline {...props} /> },
  Accordion: { ...definitions.Accordion, render: props => <UiAccordion {...props} /> },
  Tabs: { ...definitions.Tabs, render: props => <UiTabs {...props} /> },
  List: { ...definitions.List, render: props => <UiList {...props} /> },
  Choice: { ...definitions.Choice, render: props => <UiChoice {...props} /> },
  ActionButton: { ...definitions.ActionButton, render: props => <UiActionButton {...props} /> },
  Form: { ...definitions.Form, render: props => <UiForm {...props} /> },
  Confirmation: { ...definitions.Confirmation, render: props => <UiConfirmation {...props} /> },
} satisfies GenerativeUILibrary;

class RenderBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function BlockTree({ tree }: { tree: unknown }) { return renderGenerativeUI(tree, library, { status: "done" }); }
export function GenerativeUiBlocks({ blocks = [], ...host }: { blocks?: UiBlock[] } & UiActionHost) {
  return <div className="w-full min-w-0 space-y-4">{blocks.map(block => {
    const fallback = <p className="whitespace-pre-wrap rounded-xl border border-border p-4 text-sm">{block.fallbackText}</p>;
    return <RenderBoundary key={`${block.blockId}:${block.revision}`} fallback={fallback}>{supportedBlock(block) ? <UiActionProvider block={block} {...host}><BlockTree tree={block.tree} /></UiActionProvider> : fallback}</RenderBoundary>;
  })}</div>;
}
