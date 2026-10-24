"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as Accordion from "@radix-ui/react-accordion";
import * as Tabs from "@radix-ui/react-tabs";
import { AlertCircle, CheckCircle2, ChevronDown, Info } from "lucide-react";
import { z } from "zod";
import { definitions, safeUrl } from "@/lib/generative-ui/definitions";

type Props<K extends keyof typeof definitions> = z.infer<(typeof definitions)[K]["properties"]>;
const tones = {
  neutral: "border-border bg-muted/40 text-foreground",
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
};
export function UiMarkdown({ content }: Props<"Markdown">) {
  return <div className="prose prose-sm max-w-none break-words dark:prose-invert">
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
      a: ({ href, children }) => href && safeUrl(href) ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
      img: ({ src, alt }) => typeof src === "string" && safeUrl(src) ? <img src={src} alt={alt || "内容图片"} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="max-h-96 max-w-full rounded-lg" /> : <span>{alt}</span>,
    }}>{content}</ReactMarkdown>
  </div>;
}
export function UiAlert({ title, description, tone = "info" }: Props<"Alert">) {
  const Icon = tone === "success" ? CheckCircle2 : ["danger", "warning"].includes(tone) ? AlertCircle : Info;
  return <aside role="note" className={`flex gap-3 rounded-lg border p-4 ${tones[tone]}`}><Icon size={18} className="mt-0.5 shrink-0" aria-hidden /><div className="min-w-0"><p className="text-sm font-semibold">{title}</p>{description && <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{description}</p>}</div></aside>;
}
export function UiBadge({ label, tone = "neutral" }: Props<"Badge">) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{label}</span>;
}
export function UiTag({ label, tone = "neutral" }: Props<"Tag">) {
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs ${tones[tone]}`}>{label}</span>;
}
export function UiImage({ src, alt, caption, sourceUrl }: Props<"Image">) {
  const [failed, setFailed] = useState(false);
  // Browser loading only: no server-side image proxy or remote fetch authority.
  return <figure className="min-w-0 space-y-2">{failed ? <div role="img" aria-label={alt} className="rounded-lg bg-muted p-6 text-sm text-muted-foreground">图片暂不可用 · {alt}</div>
    : <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="max-h-96 w-full rounded-lg bg-muted object-contain" />}
    {(caption || sourceUrl) && <figcaption className="text-xs leading-5 text-muted-foreground">{caption}{sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-2 underline">查看来源</a>}</figcaption>}
  </figure>;
}
export function UiGallery({ title, images }: Props<"Gallery">) {
  return <section aria-label={title} className="space-y-3"><h4 className="text-sm font-medium">{title}</h4><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{images.map((image, i) => <UiImage key={`${i}:${image.src}`} {...image} />)}</div></section>;
}
export function UiKeyValue({ title, entries }: Props<"KeyValue">) {
  return <section>{title && <h4 className="mb-2 text-sm font-medium">{title}</h4>}<dl className="divide-y divide-border text-sm">{entries.map((entry, i) => <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 py-2.5"><dt className="text-muted-foreground">{entry.label}</dt><dd className="whitespace-pre-wrap break-words">{entry.value}</dd></div>)}</dl></section>;
}
export function UiSteps({ title, steps }: Props<"Steps">) {
  return <section className="space-y-3"><h4 className="text-sm font-medium">{title}</h4><ol className="space-y-4">{steps.map((step, i) => <li key={i} aria-current={step.state === "current" ? "step" : undefined} className="flex gap-3"><span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs ${step.state === "completed" ? "bg-emerald-50 text-emerald-800" : step.state === "current" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{step.state === "completed" ? <CheckCircle2 size={16} aria-label="已完成" /> : i + 1}</span><div className="min-w-0"><p className="text-sm font-medium">{step.title}{step.state === "current" && <span className="ml-2 text-xs text-muted-foreground">当前步骤</span>}</p>{step.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{step.description}</p>}</div></li>)}</ol></section>;
}
export function UiTimeline({ title, events }: Props<"Timeline">) {
  return <section className="space-y-3"><h4 className="text-sm font-medium">{title}</h4><ol className="ml-1 border-l border-border">{events.map((event, i) => <li key={i} className="relative pb-5 pl-5 last:pb-0"><span className="absolute -left-1 top-1.5 size-2 rounded-full bg-primary" />{event.time && <p className="text-xs text-muted-foreground">{event.time}</p>}<p className="text-sm font-medium">{event.title}</p>{event.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{event.description}</p>}</li>)}</ol></section>;
}
export function UiAccordion({ title, sections }: Props<"Accordion">) {
  return <section><h4 className="mb-2 text-sm font-medium">{title}</h4><Accordion.Root type="multiple">{sections.map((section, i) => <Accordion.Item key={i} value={String(i)} className="border-b border-border"><Accordion.Header><Accordion.Trigger className="group flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium outline-primary">{section.title}<ChevronDown size={15} className="shrink-0 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" /></Accordion.Trigger></Accordion.Header><Accordion.Content className="pb-4"><UiMarkdown content={section.content} /></Accordion.Content></Accordion.Item>)}</Accordion.Root></section>;
}
export function UiTabs({ title, tabs }: Props<"Tabs">) {
  return <section><h4 className="mb-3 text-sm font-medium">{title}</h4><Tabs.Root defaultValue="0"><Tabs.List aria-label={title} className="flex max-w-full gap-1 overflow-x-auto border-b border-border">{tabs.map((tab, i) => <Tabs.Trigger key={i} value={String(i)} className="shrink-0 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground outline-primary data-[state=active]:border-primary data-[state=active]:text-foreground">{tab.title}</Tabs.Trigger>)}</Tabs.List>{tabs.map((tab, i) => <Tabs.Content key={i} value={String(i)} className="pt-4 outline-primary"><UiMarkdown content={tab.content} /></Tabs.Content>)}</Tabs.Root></section>;
}
export function UiList({ title, items }: Props<"List">) {
  return <section><h4 className="mb-2 text-sm font-medium">{title}</h4><ul className="divide-y divide-border">{items.map((item, i) => <li key={i} className="py-3"><p className="text-sm font-medium">{item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{item.title}</a> : item.title}</p>{item.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.description}</p>}</li>)}</ul></section>;
}
