"use client";

import { useState } from "react";
import type { ChatInteraction as Interaction, ChatInteractionResponse } from "@/lib/interactions";

export function interactionStatus(interaction: Interaction) {
  return {
    pending: interaction.kind === "approval" ? "等待确认" : "等待回答",
    answered: "已回答", skipped: "已跳过", approved: "已批准",
    rejected: "已拒绝", cancelled: "已取消", expired: "已过期",
  }[interaction.status];
}

export function InteractionRecord({ interaction }: { interaction: Interaction }) {
  const answer = interaction.answer?.text ?? interaction.options?.find(option => option.id === interaction.answer?.optionId)?.label;
  return (
    <li className="min-w-0 border-l-2 border-[#e3e9f3] pl-3 leading-6 wrap-anywhere">
      <div className="flex flex-wrap items-center gap-x-3 text-[#53627a]">
        <span>{interaction.kind === "question" ? "补充信息" : "执行确认"}</span>
        <span>{interactionStatus(interaction)}</span>
      </div>
      <p className="text-[#34435c]">{interaction.kind === "question" ? interaction.question : interaction.toolName}</p>
      {answer && <p className="whitespace-pre-wrap text-[#53627a]">{answer}</p>}
    </li>
  );
}

export function ChatInteraction({ interaction, disabled, submitting, error, onRespond }: {
  interaction: Interaction;
  disabled?: boolean;
  submitting?: boolean;
  error?: string;
  onRespond: (response: ChatInteractionResponse) => void;
}) {
  const [optionId, setOptionId] = useState("");
  const [text, setText] = useState("");
  const blocked = disabled || submitting || interaction.status !== "pending";
  const base = { interactionId: interaction.id, revision: interaction.revision };
  const selected = interaction.options?.find(option => option.id === optionId);
  const responseText = text.trim() ? [selected?.label, text.trim()].filter(Boolean).join("\n补充：") : "";
  const primary = "rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40";
  const secondary = "rounded-lg border border-[#dce3ee] px-4 py-2.5 text-sm text-[#26344d] transition-colors hover:bg-[#f5f7fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40";
  if (interaction.status !== "pending") return <ul className="text-sm"><InteractionRecord interaction={interaction} /></ul>;
  return (
    <section className="w-full min-w-0 max-w-2xl rounded-xl border border-[#dce3ee] bg-white p-5 wrap-anywhere"
      aria-label={interaction.kind === "approval" ? "工具审批" : "补充信息"} aria-busy={submitting}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#53627a]">
        <span>{interaction.kind === "approval" ? "执行前确认" : "补充信息"}</span>
        <span role="status" className="text-primary">{submitting ? "正在提交…" : interactionStatus(interaction)}</span>
      </div>
      {interaction.kind === "question" ? <>
        <h3 className="my-4 text-base leading-7 font-medium text-[#202a3d]">{interaction.question}</h3>
        <div role="group" aria-label={interaction.question} className="grid grid-cols-1 gap-2">
          {interaction.options?.map(option => <button key={option.id} type="button" disabled={blocked}
            aria-pressed={optionId === option.id} onClick={() => setOptionId(optionId === option.id ? "" : option.id)}
            className={`${secondary} w-full text-left leading-6 ${optionId === option.id ? "border-primary bg-[#edf4ff] text-primary" : "hover:border-[#aabbd7]"}`}>
            {option.label}
          </button>)}
        </div>
        {interaction.allowCustom && <textarea aria-label="补充信息" value={text} disabled={blocked} maxLength={4000} rows={2}
          onChange={event => setText(event.target.value)} placeholder="补充信息（可选），也可以直接填写你的回答"
          className="mt-3 block w-full rounded-lg border border-[#dce3ee] px-3 py-2.5 text-sm leading-6 text-[#26344d] outline-primary placeholder:text-[#77849a] disabled:opacity-50" />}
        {responseText.length > 4000 && <p role="alert" className="mt-2 text-sm text-amber-800">选项与补充信息合计不能超过 4000 字。</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" className={secondary} disabled={blocked} onClick={() => onRespond({ kind: "question", ...base, skip: true })}>跳过</button>
          <button type="button" className={primary} disabled={blocked || (!optionId && !responseText) || responseText.length > 4000}
            onClick={() => onRespond({ kind: "question", ...base, ...(responseText ? { text: responseText } : { optionId }) })}>提交</button>
        </div>
      </> : <>
        <h3 className="my-3 text-base font-medium text-[#202a3d]">{interaction.toolName}</h3>
        {interaction.description && <p className="text-sm leading-7 text-[#4d5e78]">{interaction.description}</p>}
        <p className="mt-3 text-xs leading-6 text-[#66758c]">批准仅适用于本次调用。</p>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button type="button" className={secondary} disabled={blocked} onClick={() => onRespond({ kind: "approval", ...base, decision: "reject" })}>拒绝</button>
          <button type="button" className={primary} disabled={blocked} onClick={() => onRespond({ kind: "approval", ...base, decision: "approve" })}>批准本次调用</button>
        </div>
      </>}
      {error && <p role="alert" className="mt-3 text-sm leading-6 text-amber-800">{error}</p>}
    </section>
  );
}
