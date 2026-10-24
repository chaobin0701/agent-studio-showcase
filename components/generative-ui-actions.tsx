"use client";

import { createContext, useContext, useId, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { definitions } from "@/lib/generative-ui/definitions";
import { receiptKey, submissionMessage, type UiSubmission, type UiReceipt } from "@/lib/generative-ui/actions";
import type { UiBlock } from "@/lib/generative-ui/blocks";

type Props<K extends keyof typeof definitions> = z.infer<(typeof definitions)[K]["properties"]>;
export type UiActionHost = { disabled?: boolean; receipts?: UiReceipt[]; onSubmit?: (input: UiSubmission) => Promise<void> };
const ActionContext = createContext<UiActionHost & { block?: UiBlock }>({});
export function UiActionProvider({ block, children, ...host }: UiActionHost & { block: UiBlock; children: ReactNode }) {
  return <ActionContext.Provider value={{ block, ...host }}>{children}</ActionContext.Provider>;
}
const button = "rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground outline-primary transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45";
const secondary = "rounded-lg border border-border px-4 py-2.5 text-sm outline-primary hover:bg-muted disabled:opacity-45";
const control = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-primary disabled:opacity-60";

function useSubmission(componentId: string) {
  const host = useContext(ActionContext);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const base = host.block && { blockId: host.block.blockId, revision: host.block.revision, componentId };
  const receipt = base && host.receipts?.find(value => receiptKey(value) === receiptKey(base));
  const blocked = !!(host.disabled || pending || receipt || !host.onSubmit || !host.block);
  const submit = async (data: Pick<UiSubmission, "values" | "decision"> = {}) => {
    if (blocked || lock.current || !base || !host.block || !host.onSubmit) return;
    lock.current = true;
    setPending(true); setError("");
    try {
      const input = { ...base, ...data };
      submissionMessage(host.block, input);
      await host.onSubmit(input);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "提交失败，请刷新后重试"); }
    finally { lock.current = false; setPending(false); }
  };
  const notice = <>{(pending || receipt) && <p role="status" className="mt-2 text-xs text-muted-foreground">{pending ? "正在提交…" : receipt?.state === "completed" ? "已提交" : receipt?.state === "failed" ? "已提交，后续回答未完成" : "已提交，请查看会话状态"}</p>}{error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</>;
  return { blocked, receipt, submit, notice };
}

export function UiActionButton({ id, label, action }: Props<"ActionButton">) {
  const state = useSubmission(id);
  if (action.type === "open_url") return <a href={action.url} target="_blank" rel="noopener noreferrer" className={`${secondary} inline-flex`}>{label}<span className="sr-only">（在新标签页打开）</span></a>;
  return <div><button type="button" disabled={state.blocked} className={button} onClick={() => void state.submit()}>{label}</button>{state.notice}</div>;
}
export function UiChoice({ id, title, multiple, options, submitLabel = "提交选择" }: Props<"Choice">) {
  const state = useSubmission(id);
  const [selected, setSelected] = useState<string[]>([]);
  const name = useId();
  const values = state.receipt?.values?.selection;
  const selection = Array.isArray(values) ? values : selected;
  return <form onSubmit={event => { event.preventDefault(); void state.submit({ values: { selection } }); }}>
    <fieldset disabled={state.blocked}><legend className="mb-3 text-sm font-medium">{title}</legend><div className="grid gap-2 sm:grid-cols-2">{options.map(option => <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${selection.includes(option.value) ? "border-primary bg-primary/5" : "border-border"}`}><input type={multiple ? "checkbox" : "radio"} name={name} value={option.value} checked={selection.includes(option.value)} className="mt-0.5 accent-primary" onChange={event => setSelected(multiple ? event.target.checked ? [...selected, option.value] : selected.filter(value => value !== option.value) : [option.value])} /><span>{option.label}</span></label>)}</div><button className={`${button} mt-3`} disabled={!selection.length || state.blocked}>{submitLabel}</button></fieldset>{state.notice}
  </form>;
}
export function UiForm({ id, title, description, fields, submitLabel = "提交信息" }: Props<"Form">) {
  const state = useSubmission(id);
  const prefix = useId();
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const shown = state.receipt?.values ?? values;
  return <form onSubmit={event => { event.preventDefault(); void state.submit({ values }); }}>
    <fieldset disabled={state.blocked} className="space-y-4"><legend className="mb-2 text-sm font-medium">{title}</legend>{description && <p className="text-sm text-muted-foreground">{description}</p>}{fields.map(field => {
      const inputId = `${prefix}-${field.name}`;
      const value = shown[field.name];
      const update = (value: string | number | boolean) => setValues(previous => ({ ...previous, [field.name]: value }));
      return <div key={field.name} className="space-y-1.5"><label htmlFor={inputId} className="text-sm font-medium">{field.label}{field.required && <span className="ml-1 text-xs text-muted-foreground">（必填）</span>}</label>
        {field.type === "textarea" ? <textarea id={inputId} required={field.required} maxLength={1000} rows={3} value={String(value ?? "")} placeholder={field.placeholder} onChange={event => update(event.target.value)} className={control} />
          : field.type === "select" ? <select id={inputId} required={field.required} value={String(value ?? "")} onChange={event => update(event.target.value)} className={control}><option value="">请选择</option>{field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          : field.type === "checkbox" ? <input id={inputId} type="checkbox" required={field.required} checked={value === true} onChange={event => update(event.target.checked)} className="ml-3 accent-primary" />
          : <input id={inputId} type={field.type} required={field.required} maxLength={1000} step={field.type === "number" ? "any" : undefined} value={typeof value === "boolean" || Array.isArray(value) ? "" : value ?? ""} placeholder={field.placeholder} onChange={event => update(field.type === "number" && event.target.value !== "" ? event.target.valueAsNumber : event.target.value)} className={control} />}
      </div>;
    })}<button className={button} disabled={state.blocked}>{submitLabel}</button></fieldset>{state.notice}
  </form>;
}
export function UiConfirmation({ id, title, description, message, confirmLabel = "确认并继续", cancelLabel = "取消" }: Props<"Confirmation">) {
  const state = useSubmission(id);
  return <section aria-label={title} className="space-y-3 border-l-2 border-primary pl-4"><h4 className="text-sm font-semibold">{title}</h4><p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{description}</p><blockquote className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{message}</blockquote><div className="flex flex-wrap gap-2"><button type="button" className={secondary} disabled={state.blocked} onClick={() => void state.submit({ decision: "cancel" })}>{cancelLabel}</button><button type="button" className={button} disabled={state.blocked} onClick={() => void state.submit({ decision: "confirm" })}>{confirmLabel}</button></div>{state.receipt?.decision && <p className="text-xs text-muted-foreground">{state.receipt.decision === "confirm" ? "你的选择：确认" : "你的选择：取消"}</p>}{state.notice}</section>;
}
