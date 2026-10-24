"use client";
import { useState } from "react";
import Link from "next/link";
import { GenerativeUiBlocks } from "./generative-ui";
import { previewBlocks } from "@/lib/generative-ui/examples";
import { submissionMessage, type UiReceipt } from "@/lib/generative-ui/actions";

export function GenerativeUiPreview() {
  const [receipts, setReceipts] = useState<UiReceipt[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [generation, setGeneration] = useState(0);
  return <main className="mx-auto max-w-5xl px-5 py-12 text-foreground">
    <Link href="/" className="text-sm text-muted-foreground underline">返回展示站</Link>
    <h1 className="mt-6 text-3xl font-semibold tracking-tight">生成式 UI · 组件预览</h1>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">21 个可组合组件。此页使用演示数据，按钮、选项和表单只记录演示消息，不调用 Agent。可以用键盘切换标签页、展开说明或填写表单。</p>
    <div key={generation} className="mt-10 grid min-w-0 gap-5 md:grid-cols-2">{previewBlocks.map(block => <section key={block.blockId} className="min-w-0 rounded-xl border border-border bg-background p-5">
      <h2 className="mb-5 font-mono text-xs text-muted-foreground">{(block.tree as { _type: string })._type}</h2>
      <GenerativeUiBlocks blocks={[block]} receipts={receipts} onSubmit={async input => {
        const text = submissionMessage(block, input);
        setReceipts(previous => [...previous, { ...input, state: "completed" }]);
        setMessages(previous => [...previous, text]);
      }} />
    </section>)}</div>
    <section className="mt-8 rounded-xl border border-border p-5" aria-label="演示提交记录">
      <div className="flex items-center justify-between gap-4"><h2 className="font-semibold">演示提交记录</h2><button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => { setReceipts([]); setMessages([]); setGeneration(value => value + 1); }}>重置演示</button></div>
      <div aria-live="polite" className="mt-4 space-y-3 text-sm">{messages.length ? messages.map((message, i) => <pre key={i} className="whitespace-pre-wrap break-words rounded-lg bg-muted p-3 font-sans">{message}</pre>) : <p className="text-muted-foreground">点击上面的交互组件后，这里会显示对应消息。</p>}</div>
    </section>
  </main>;
}
