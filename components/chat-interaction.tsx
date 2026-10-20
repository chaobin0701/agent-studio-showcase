"use client";

import { useState } from "react";
import type {
  ChatInteraction as Interaction,
  ChatInteractionResponse,
} from "@/lib/interactions";

export function ChatInteraction({
  interaction,
  disabled,
  submitting,
  error,
  onRespond,
  onCancel,
}: {
  interaction: Interaction;
  disabled?: boolean;
  submitting?: boolean;
  error?: string;
  onRespond: (response: ChatInteractionResponse) => void;
  onCancel?: () => void;
}) {
  const [optionId, setOptionId] = useState("");
  const [custom, setCustom] = useState(!interaction.options?.length);
  const [text, setText] = useState("");
  const pending = interaction.status === "pending";
  const blocked = disabled || submitting || !pending;
  const state = {
    pending: interaction.kind === "approval" ? "等待确认" : "等待回答",
    answered: "已回答",
    approved: "已批准",
    rejected: "已拒绝",
    cancelled: "已取消",
    expired: "已过期",
  }[interaction.status];
  const base = {
    interactionId: interaction.id,
    revision: interaction.revision,
  };
  const answer =
    interaction.answer?.text ??
    interaction.options?.find(
      (option) => option.id === interaction.answer?.optionId,
    )?.label;
  const primary =
    "rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40";
  const secondary =
    "rounded-lg border border-[#dce3ee] px-4 py-2.5 text-sm text-[#26344d] disabled:opacity-40";
  return (
    <section
      className="w-full min-w-0 max-w-2xl rounded-xl border border-[#dce3ee] bg-white p-4 wrap-anywhere"
      aria-label={interaction.kind === "approval" ? "工具审批" : "补充信息"}
      aria-busy={submitting}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#66758c]">
        <span>
          {interaction.kind === "approval" ? "执行前确认" : "补充信息"}
        </span>
        <span role="status" className="text-primary">
          {submitting ? "正在提交…" : state}
        </span>
      </div>
      {interaction.kind === "question" ? (
        <>
          <h3 className="my-3 text-base leading-7 font-medium break-words text-[#202a3d]">
            {interaction.question}
          </h3>
          {pending ? (
            <>
              <div
                role="group"
                aria-label={interaction.question}
                className="mb-3 flex flex-wrap gap-2"
              >
                {interaction.options?.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={blocked}
                    aria-pressed={!custom && optionId === option.id}
                    onClick={() => {
                      setOptionId(option.id);
                      setCustom(false);
                    }}
                    className={`${secondary} ${!custom && optionId === option.id ? "border-primary bg-[#edf4ff] text-primary" : "hover:border-[#aabbd7]"}`}
                  >
                    {option.label}
                  </button>
                ))}
                {interaction.allowCustom && (
                  <button
                    type="button"
                    className={`${secondary} ${custom ? "border-primary bg-[#edf4ff] text-primary" : ""}`}
                    aria-pressed={custom}
                    disabled={blocked}
                    onClick={() => setCustom(true)}
                  >
                    自由填写
                  </button>
                )}
              </div>
              {custom && interaction.allowCustom && (
                <textarea
                  aria-label="填写回答"
                  value={text}
                  disabled={blocked}
                  maxLength={4000}
                  rows={2}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="填写你的回答"
                  className="w-full rounded-lg border border-[#dce3ee] px-3 py-2 text-sm leading-6 outline-primary disabled:opacity-50"
                />
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={primary}
                  disabled={blocked || !(custom ? text.trim() : optionId)}
                  onClick={() =>
                    onRespond({
                      kind: "question",
                      ...base,
                      ...(custom ? { text: text.trim() } : { optionId }),
                    })
                  }
                >
                  提交回答
                </button>
                {onCancel && (
                  <button
                    type="button"
                    className={secondary}
                    disabled={blocked}
                    onClick={onCancel}
                  >
                    取消任务
                  </button>
                )}
              </div>
            </>
          ) : (
            answer && (
              <p className="text-sm leading-7 whitespace-pre-wrap text-[#34435c]">
                {answer}
              </p>
            )
          )}
        </>
      ) : (
        <>
          <h3 className="my-3 text-base font-medium break-all text-[#202a3d]">
            {interaction.toolName}
          </h3>
          {interaction.description && (
            <p className="text-sm leading-7 text-[#4d5e78]">
              {interaction.description}
            </p>
          )}
          <details open className="my-3 text-sm text-[#34435c]">
            <summary className="cursor-pointer">调用参数</summary>
            <pre className="mt-2 max-h-72 max-w-full overflow-auto rounded-lg bg-[#f5f7fb] p-3 text-xs leading-6 wrap-anywhere whitespace-pre-wrap">
              {JSON.stringify(interaction.arguments ?? {}, null, 2)}
            </pre>
          </details>
          {pending && (
            <>
              <p className="text-xs leading-6 text-[#66758c]">
                批准仅适用于本次调用及以上参数。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={primary}
                  disabled={blocked}
                  onClick={() =>
                    onRespond({
                      kind: "approval",
                      ...base,
                      decision: "approve",
                    })
                  }
                >
                  批准本次调用
                </button>
                <button
                  type="button"
                  className={secondary}
                  disabled={blocked}
                  onClick={() =>
                    onRespond({ kind: "approval", ...base, decision: "reject" })
                  }
                >
                  拒绝
                </button>
              </div>
            </>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm leading-6 text-amber-800">
          {error}
        </p>
      )}
    </section>
  );
}
