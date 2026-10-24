"use client";

// Zola's prompt-kit conversation, composer and message components, with a custom Agent Studio transport.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  Copy,
  Database,
  Github,
  Loader2,
  Menu,
  MessageSquare,
  PanelLeftClose,
  Plus,
  RefreshCw,
  Square,
  Trash2,
  X,
} from "lucide-react";
import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/prompt-kit/chat-container";
import { ScrollButton } from "@/components/prompt-kit/scroll-button";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Brand } from "@/components/site-shell";
import { RobotData } from "@/components/robot-data";
import { SuggestedQuestions } from "@/components/suggested-questions";
import { DemoSwitcher } from "@/components/navigation-menu";
import { projectForDemo, type findDemo } from "@/lib/catalog";
import {
  profileForDemo,
  profilesForDemo,
  periodsForDemo,
} from "@/lib/demo-profiles";
import { ContosoData } from "@/components/contoso-data";
import { suggestedFollowUps } from "@/lib/suggestions";
import { sseParser } from "@/lib/sse";
import type { Thread } from "@/lib/server/store";
import { submissionMessage, receiptKey, type UiSubmission, type UiReceipt } from "@/lib/generative-ui/actions";
import { GenerativeUiBlocks } from "@/components/generative-ui";
import { readUiBlocks, upsertUiBlock, type UiBlock } from "@/lib/generative-ui/blocks";
import { ChatInteraction, InteractionRecord } from "@/components/chat-interaction";
import type { ChatInteraction as Interaction, ChatInteractionResponse } from "@/lib/interactions";

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  incomplete?: boolean;
  progressEvents?: PublicProgress[];
  citations?: { documentTitle?: string; originalFilename?: string }[];
  runId?: string;
  status?: string;
  refused?: boolean;
  structured?: unknown;
  uiBlocks?: UiBlock[];
  interactions?: Interaction[];
  contextUsage?: {
    model: string;
    contextWindowTokens: number;
    inputBudgetTokens: number;
    estimatedInputTokens: number;
    remainingInputTokens: number;
    usagePercent: number;
    measurementSource: "heuristic" | "provider";
    maxOutputTokens: number;
    safetyBufferTokens: number;
    measuredAt: string;
    includesDraft: false;
  };
};
type ChatQuota = {
  scope: "application-shared";
  resetAt: string;
  timezone: string;
  checkedAt: string;
  requests?: { limit: number; used: number; remaining: number };
  tokens?: { limit: number; used: number; reserved: number; remaining: number; unsettled: boolean };
};
type PublicProgress = {
  id?: string;
  stage?: string;
  status?: string;
  tool?: string;
  text?: string;
  ok?: boolean;
};
const toolLabels: Record<string, string> = {
  search_knowledge: "检索知识库",
  read_file: "读取排查流程",
  get_user_id: "确认模拟家庭",
  get_user_location: "查询家庭城市",
  get_weather: "查询模拟天气",
  fetch_external_data: "读取使用记录",
  fill_context_for_report: "读取报告栏目",
  get_current_month: "核对月份",
  list_demo_users: "查询示例家庭",
  contoso_search_products: "查找符合条件的装备",
  contoso_get_product: "读取商品规格",
  contoso_compare_products: "比较装备",
  contoso_list_customers: "查看模拟客户",
  contoso_get_customer: "查询模拟客户背景",
  contoso_get_orders: "读取模拟购买记录",
  ask_user: "补充信息",
  present: "生成可视化界面",
};
function PublicActivity({ events = [], interactions = [] }: { events?: PublicProgress[]; interactions?: Interaction[] }) {
  const tools = new Map<string, PublicProgress>();
  for (const event of events)
    if (event.stage === "tool" && event.tool) tools.set(event.tool, event);
  const resolved = interactions.filter(item => item.status !== "pending");
  if (!tools.size && !resolved.length) return null;
  return (
    <details key={resolved.map(item => `${item.id}:${item.status}`).join('|')} className="mb-2 w-full text-sm text-[#63718a]">
      <summary className="cursor-pointer select-none py-1">
        工具调用过程 · {tools.size + resolved.length} 项
      </summary>
      <ul className="mt-2 space-y-2 border-l border-[#e3e9f3] pl-3">
        {[...tools].map(([name, event]) => (
          <li key={name} className="flex items-center gap-2">
            {event.status === "completed" && event.ok ? (
              <Check size={11} className="text-[#75ad99]" />
            ) : (
              <span className="size-1 rounded-full bg-[#bac2ce]" />
            )}
            <span>{toolLabels[name] ?? "查询外部资料"}</span>
            <span>
              {event.status === "completed"
                ? event.ok
                  ? "已完成"
                  : "未完成"
                : "进行中"}
            </span>
          </li>
        ))}
        {resolved.map(interaction => <InteractionRecord key={interaction.id} interaction={interaction} />)}
      </ul>
    </details>
  );
}
type Demo = NonNullable<ReturnType<typeof findDemo>>;
async function readJson(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "请求失败");
  return data;
}
function publicText(value: string) {
  return value.replace(/\n\n\[公开演示资料：[\s\S]*\]$/, "");
}

export function ChatWorkspace({ demo }: { demo: Demo }) {
  const [sidebar, setSidebar] = useState(false);
  const [inspector, setInspector] = useState(false);
  const [contextInfoOpen, setContextInfoOpen] = useState(false);
  const [threadList, setThreadList] = useState<Thread[]>([]);
  const [current, setCurrent] = useState<Thread | null>(null);
  const [persona, setPersona] = useState(profilesForDemo(demo.slug)[0].id);
  const [month, setMonth] = useState(periodsForDemo(demo.slug)[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uiReceipts, setUiReceipts] = useState<UiReceipt[]>([]);
  const [input, setInput] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [recoverable, setRecoverable] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [interactionErrors, setInteractionErrors] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState<boolean | null>(null);
  const [quota, setQuota] = useState<ChatQuota | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [copied, setCopied] = useState("");
  const abort = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const inspectorRef = useRef<HTMLElement | null>(null);
  const inspectorTrigger = useRef<HTMLElement | null>(null);
  const contextMeterRef = useRef<HTMLDivElement | null>(null);
  const generation = useRef(0);
  const profile = profileForDemo(demo.slug, persona)!;
  const isContoso = demo.slug === "contoso-outdoor";
  const contextLabel = isContoso ? "2023 年样例" : `${month} 示例`;
  const lastMessage = messages.at(-1);
  const lastAssistant = lastMessage?.role === "assistant" ? lastMessage : undefined;
  const completedAssistant = lastAssistant?.status === "completed" && !lastAssistant.incomplete && !lastAssistant.refused
    ? lastAssistant
    : undefined;
  // Keep the last completed measurement visible while the next reply streams.
  // Derive it from this thread so switching roles or conversations cannot leak it.
  const contextUsage = messages.findLast(message =>
    message.role === "assistant" && message.status === "completed" && !message.incomplete && message.contextUsage
  )?.contextUsage;
  const contextPercent = contextUsage ? Math.round(contextUsage.usagePercent) : undefined;
  const followUps = completedAssistant ? suggestedFollowUps(completedAssistant.structured) : [];
  const outgoingText = input.trim() || followUps[0] || "";
  function formatTokens(value: number) { return new Intl.NumberFormat("zh-CN").format(value); }
  function resetTime(value: ChatQuota) {
    return new Intl.DateTimeFormat("zh-CN", { timeZone: value.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value.resetAt));
  }
  function showProfile(event: MouseEvent<HTMLButtonElement>) {
    inspectorTrigger.current = event.currentTarget;
    if (window.innerWidth < 768) setSidebar(false);
    setInspector(true);
  }
  function closeInspector() {
    setInspector(false);
    // A sidebar trigger may have been hidden when the mobile panel opened.
    const trigger = inspectorTrigger.current;
    if (trigger && trigger.getBoundingClientRect().right > 0) trigger.focus();
    else document.querySelector<HTMLButtonElement>('[aria-label="展开导航"]')?.focus();
  }
  useEffect(() => {
    if (!inspector) return;
    inspectorRef.current?.focus();
  }, [inspector]);
  useEffect(() => {
    if (!contextInfoOpen) return;
    const dismissOutside = (event: PointerEvent) => {
      if (!contextMeterRef.current?.contains(event.target as Node)) setContextInfoOpen(false);
    };
    const dismissOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setContextInfoOpen(false);
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [contextInfoOpen]);
  useEffect(() => {
    try { setInput(sessionStorage.getItem(`showcase:draft:${demo.slug}`) ?? ""); }
    catch { /* A blocked session store should not prevent chatting. */ }
    setDraftLoaded(true);
  }, [demo.slug]);
  useEffect(() => {
    if (!draftLoaded) return;
    try { sessionStorage.setItem(`showcase:draft:${demo.slug}`, input); }
    catch { /* Draft persistence is optional in restricted browsers. */ }
  }, [demo.slug, input, draftLoaded]);
  async function refreshList() {
    const data = await readJson(
      await fetch(`/api/hub/threads?demo=${demo.slug}`, { cache: "no-store" }),
    );
    setThreadList(data.threads);
    return data.threads as Thread[];
  }
  async function refreshStatus() {
    const data = await readJson(await fetch(`/api/hub/status?demo=${demo.slug}`, { cache: "no-store" }));
    setConnected(data.connected);
    setQuota(data.quota ?? null);
  }
  async function loadThread(id: string) {
    const version = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const data = await readJson(
        await fetch(`/api/hub/threads/${id}`, { cache: "no-store" }),
      );
      if (generation.current !== version) return;
      const restoredMessages = data.messages.map((message: ChatMessage) => ({
        ...message,
        content: publicText(message.content),
        uiBlocks: readUiBlocks(message.uiBlocks),
        ...(message.role === "assistant" && !message.status ? { status: "completed" } : {}),
      }));
      setCurrent(data.thread);
      setPersona(data.thread.persona);
      setMonth(data.thread.month);
      setMessages(restoredMessages);
      setUiReceipts(data.uiReceipts ?? []);
      setPending(Boolean(data.pending));
      setRecoverable(data.pending?.state === "unknown");
      setWaiting(data.pending?.state === "waiting");
      if (window.innerWidth < 768) setSidebar(false);
      return data;
    } catch (error) {
      if (generation.current === version)
        setError(error instanceof Error ? error.message : "会话加载失败");
    } finally {
      if (generation.current === version) setLoading(false);
    }
  }
  useEffect(() => {
    setSidebar(window.innerWidth >= 768);
    let disposed = false;
    refreshStatus().catch(() => { if (!disposed) { setConnected(false); setQuota(null); } });
    const onFocus = () => { if (document.visibilityState === "visible") void refreshStatus().catch(() => {}); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    refreshList()
      .then((items) => {
        if (!disposed && items.length) void loadThread(items[0].id);
      })
      .catch((error) => {
        if (!disposed) setError(error.message);
      });
    return () => {
      disposed = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      generation.current++;
      abort.current?.abort();
    };
    // Each route mounts its own workspace; switching Demo never shares a thread.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo.slug]);
  function newThread(nextPersona = persona, nextMonth = month) {
    generation.current++;
    setLoading(false);
    setCurrent(null);
    setMessages([]);
    setUiReceipts([]);
    setPending(false);
    setRecoverable(false);
    setWaiting(false);
    setInteractionErrors({});
    setError("");
    setProgress("");
    setInput("");
    setPersona(nextPersona);
    setMonth(nextMonth);
    if (window.innerWidth < 768) setSidebar(false);
  }
  function addFollowUp(question: string) {
    const base = input.trimEnd();
    const next = base ? `${base}\n${question}` : question;
    if (next.length > 1600) {
      setError("草稿已接近长度上限，请先删减部分内容再添加追问。");
      return;
    }
    setError("");
    setInput(next);
  }
  async function remove(item: Thread) {
    if (!window.confirm("删除这段对话？此操作会同时删除对应的聊天历史。"))
      return;
    try {
      const response = await fetch(`/api/hub/threads/${item.id}`, {
        method: "DELETE",
      });
      if (!response.ok) await readJson(response);
      if (current?.id === item.id) newThread();
      await refreshList();
    } catch (error) {
      setError(error instanceof Error ? error.message : "删除失败");
    }
  }
  async function recover() {
    if (!current || busy || waiting) return;
    setLoading(true);
    setError("");
    try {
      await readJson(
        await fetch(`/api/hub/threads/${current.id}/recover`, {
          method: "POST",
        }),
      );
      await loadThread(current.id);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "恢复失败，请稍后刷新状态",
      );
    } finally {
      setLoading(false);
    }
  }
  async function receive(response: Response, assistantId: string) {
    if (!response.body) throw new Error("连接没有返回内容");
    let settled = false;
    const parser = sseParser(({ event, data }) => {
      if (event === "tool_ui") {
        setMessages(previous => previous.map(value => value.id === assistantId ? { ...value, uiBlocks: upsertUiBlock(value.uiBlocks, data) } : value));
      }
      if (event === "progress") {
        const entry = data as PublicProgress;
        setProgress(
          entry.tool
            ? `${toolLabels[entry.tool] ?? "查询外部资料"}${entry.status === "completed" ? "完成" : "中…"}`
            : String(data.text ?? "正在处理任务…"),
        );
        setMessages((previous) =>
          previous.map((value) =>
            value.id === assistantId
              ? {
                  ...value,
                  progressEvents: [
                    ...(value.progressEvents ?? []).filter(
                      (old) => !entry.id || old.id !== entry.id,
                    ),
                    entry,
                  ],
                }
              : value,
          ),
        );
      }
      if (event === "commentary_delta")
        setProgress((previous) =>
          previous.startsWith("正在")
            ? String(data.text ?? "")
            : previous + String(data.text ?? ""),
        );
      if (event === "commentary_completed")
        setProgress(String(data.text ?? ""));
      if (event === "answer_delta" || event === "answer_reset") {
        setProgress("正在整理回答…");
        setMessages((previous) =>
          previous.map((value) =>
            value.id === assistantId
              ? {
                  ...value,
                  content:
                    event === "answer_reset"
                      ? String(data.text ?? "")
                      : value.content + String(data.text ?? ""),
                }
              : value,
          ),
        );
      }
      if (event === "interaction_required" && data.interaction) {
        settled = true;
        const interaction = data.interaction as Interaction;
        setPending(true);
        setRecoverable(false);
        setWaiting(true);
        setProgress("");
        setMessages((previous) => previous.map((value) => value.id === assistantId ? {
          ...value, incomplete: false, status: "waiting", runId: String(data.runId ?? interaction.runId),
          interactions: [...(value.interactions ?? []).filter((item) => item.id !== interaction.id), interaction],
        } : value));
      }
      if (event === "done") {
        settled = true;
        setPending(false);
        setRecoverable(false);
        setWaiting(false);
        setProgress("");
        setMessages((previous) =>
          previous.map((value) =>
            value.id === assistantId
              ? {
                  ...value,
                  content: String(data.answer ?? ""),
                  incomplete: false, status: "completed",
                  progressEvents:
                    (data.progressEvents as PublicProgress[] | undefined) ??
                    value.progressEvents,
                  citations: (data.citations ??
                    []) as ChatMessage["citations"],
                  contextUsage: data.contextUsage as ChatMessage["contextUsage"],
                  structured: data.structured,
                  uiBlocks: readUiBlocks(data.uiBlocks),
                  refused: data.refused === true,
                }
              : value,
          ),
        );
        void refreshStatus().catch(() => {});
      }
      if (event === "error")
        throw new Error(String(data.message ?? "回答未完成"));
    });
    const reader = response.body.getReader();
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        parser.push(part.value);
      }
      parser.end();
    } finally {
      reader.releaseLock();
    }
    if (!settled) throw new Error("连接已结束，结果尚未确认。请刷新会话状态。");
  }
  async function send(text?: string, uiSubmission?: UiSubmission) {
    const message = (text ?? (input.trim() ? input : followUps[0] ?? "")).trim();
    if (message.length < 2 || inFlight.current || busy || pending || loading || connected !== true) {
      if (uiSubmission) throw new Error("当前无法提交，请先确认会话状态");
      return;
    }
    if (message.length > 1600) {
      setError("消息最多 1600 个字符");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    if (!uiSubmission) setInput("");
    setProgress("正在连接助手…");
    const assistantId = crypto.randomUUID();
    const controller = new AbortController();
    abort.current = controller;
    try {
      let item = current;
      if (!item) {
        item = await readJson(
          await fetch("/api/hub/threads", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ demo: demo.slug, persona, month }),
          }),
        );
        setCurrent(item);
      }
      if (!item) throw new Error("会话创建失败");
      setMessages((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: "user", content: message },
        { id: assistantId, role: "assistant", content: "" },
      ]);
      const response = await fetch(`/api/chat/${demo.slug}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          threadId: item.id,
          requestId: crypto.randomUUID(),
          ...(uiSubmission ? { uiSubmission } : { message }),
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "暂时无法发送");
      }
      if (!response.body) throw new Error("连接没有返回内容");
      await receive(response, assistantId);
      if (uiSubmission) setUiReceipts(previous => [...previous.filter(value => receiptKey(value) !== receiptKey(uiSubmission)), { ...uiSubmission, state: "completed" }]);
    } catch (error) {
      setPending(true);
      setRecoverable(true);
      setMessages((previous) =>
        previous.map((value) =>
          value.id === assistantId ? { ...value, incomplete: true } : value,
        ),
      );
      setError(
        error instanceof Error && error.name === "AbortError"
          ? "已停止接收。助手可能仍在执行，请稍后刷新会话状态。"
          : error instanceof Error
            ? error.message
            : "连接中断，请刷新状态。",
      );
      if (uiSubmission) throw error;
    } finally {
      inFlight.current = false;
      setBusy(false);
      setProgress("");
      abort.current = null;
      void refreshList().catch(() => {});
    }
  }
  async function respond(response: ChatInteractionResponse) {
    if (!current || inFlight.current || busy || loading || !waiting) return;
    const producer = messages.find((message) => message.interactions?.some((i) => i.id === response.interactionId && i.status === "pending"));
    if (!producer) return;
    inFlight.current = true;
    setBusy(true);
    setRespondingId(response.interactionId);
    setInteractionErrors((previous) => ({ ...previous, [response.interactionId]: "" }));
    const controller = new AbortController();
    abort.current = controller;
    try {
      const result = await fetch(`/api/chat/${demo.slug}/interactions/${response.interactionId}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId: current.id, response }), signal: controller.signal,
      });
      if (!result.ok) await readJson(result);
      const accepted = () => { setWaiting(false); setMessages(previous => previous.map(message => ({
        ...message,
        interactions: message.interactions?.map(item => item.id !== response.interactionId ? item : {
          ...item, revision: item.revision + 1,
          status: response.kind === "approval" ? response.decision === "approve" ? "approved" : "rejected" : response.skip ? "skipped" : "answered",
          ...(response.kind === "question" ? { answer: response.skip ? { skipped: true as const } : response.optionId ? { optionId: response.optionId, text: item.options?.find(option => option.id === response.optionId)?.label } : { text: response.text } } : {}),
        }),
      }))); };
      if (result.headers.get("content-type")?.includes("application/json")) {
        const replay = await readJson(result);
        if (replay.replayed !== true) throw new Error("交互答复尚未确认，请刷新状态");
        accepted();
      } else { accepted(); await receive(result, producer.id); }
      await loadThread(current.id);
    } catch (failure) {
      // Resolve uncertain submissions by reading state. Approval is never sent
      // again automatically or transformed into a normal chat message.
      const fresh = await loadThread(current.id);
      const stillPending = !fresh || fresh.messages.some((message: ChatMessage) => message.interactions?.some((item) => item.id === response.interactionId && item.status === "pending"));
      if (stillPending) setInteractionErrors((previous) => ({ ...previous,
        [response.interactionId]: `${failure instanceof Error ? failure.message : "提交未完成"}；请刷新状态，确认仍待处理后再提交同一答复。`,
      }));
      else if (fresh?.messages.some((message: ChatMessage) => message.status === "failed" && message.interactions?.some((item) => item.id === response.interactionId)))
        setError(failure instanceof Error ? failure.message : "本轮执行未完成，请刷新状态。");
    } finally {
      inFlight.current = false;
      setBusy(false);
      setRespondingId(null);
      setProgress("");
      abort.current = null;
      void refreshList().catch(() => {});
    }
  }
  async function cancelQuestion(interactionId: string) {
    if (!current || inFlight.current || busy || loading || !waiting) return;
    inFlight.current = true;
    setRespondingId(interactionId);
    setBusy(true);
    setInteractionErrors((previous) => ({ ...previous, [interactionId]: "" }));
    const controller = new AbortController();
    abort.current = controller;
    try {
      await readJson(await fetch(`/api/chat/${demo.slug}/interactions/${interactionId}/cancel`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ threadId: current.id }), signal: controller.signal,
      }));
      await loadThread(current.id);
    } catch (failure) {
      const fresh = await loadThread(current.id);
      if (!fresh || fresh.messages.some((message: ChatMessage) => message.interactions?.some((item) => item.id === interactionId && item.status === "pending")))
        setInteractionErrors((previous) => ({ ...previous, [interactionId]: `${failure instanceof Error ? failure.message : "取消未确认"}；请刷新状态。` }));
    } finally {
      inFlight.current = false;
      setRespondingId(null);
      setBusy(false);
      abort.current = null;
      void refreshList().catch(() => {});
    }
  }
  return (
    <TooltipProvider>
      <div className="chat-shell">
        {sidebar && (
          <button
            aria-label="关闭导航遮罩"
            className="fixed inset-0 z-40 bg-black/15 md:hidden"
            onClick={() => setSidebar(false)}
          />
        )}
        <aside
          className={`chat-sidebar ${sidebar ? "" : "collapsed"}`}
          aria-label="聊天导航"
          inert={!sidebar}
        >
          <div className="chat-sidebar-brand mb-8 flex items-center justify-between px-2">
            <Brand />
            <button
              className="icon-button"
              aria-label="收起导航"
              onClick={() => setSidebar(false)}
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
          <div className="mb-5">
            <DemoSwitcher current={demo.slug} disabled={busy || loading || pending} />
          </div>
          <button
            className="mb-7 flex items-center gap-3 rounded-xl bg-[#edf1f8] px-4 py-3 text-xs font-medium hover:bg-[#e2e9f5] disabled:opacity-40"
            disabled={busy}
            onClick={() => newThread()}
          >
            <Plus size={17} />
            新建对话
          </button>
          <p className="mb-3 px-2 text-[10px] tracking-wider text-[#9a9fab]">
            最近对话
          </p>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {threadList.length === 0 && (
              <p className="px-2 text-xs leading-7 text-[#b0b4bf]">
                第一段对话，从这里开始。
              </p>
            )}
            {threadList.map((item) => (
              <div
                key={item.id}
                className={`sidebar-thread ${current?.id === item.id ? "active" : ""}`}
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:opacity-40"
                  disabled={busy}
                  onClick={() => void loadThread(item.id)}
                >
                  <MessageSquare size={13} className="shrink-0 opacity-60" />
                  <span className="truncate">{item.title}</span>
                </button>
                <button
                  className="shrink-0 p-1 text-[#a7acb6] hover:text-red-500 disabled:opacity-30"
                  aria-label={`删除对话：${item.title}`}
                  disabled={busy}
                  onClick={() => void remove(item)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-[#e8eaf0] pt-4">
            <Link
              href={projectForDemo(demo.slug) ? `/projects/${projectForDemo(demo.slug)!.slug}` : "/"}
              className="flex items-center gap-2 px-2 text-xs text-[#888e9a]"
            >
              <ArrowLeft size={13} />
              查看应用详情
            </Link>
            <button type="button" className="chat-profile-trigger mt-4 flex min-h-12 w-full items-center gap-2 rounded-xl px-2 text-left"
              aria-label={`查看或切换角色：${profile.name}`} aria-controls="chat-profile-panel" aria-expanded={inspector}
              onClick={showProfile}>
              <span
                className="grid size-7 place-items-center rounded-full text-[10px]"
                style={{ background: profile.avatar }}
              >
                {profile.name[0]}
              </span>
              <span className="text-xs">{profile.name}</span>
              <span className="ml-auto text-[10px] text-[#8c94a3]">
                模拟用户
              </span>
              <ChevronDown size={13} className="shrink-0 text-[#9aa2af]" aria-hidden="true" />
            </button>
          </div>
        </aside>
        <main className="chat-main">
          <header className="chat-topbar">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {!sidebar && (
                <button
                  className="icon-button"
                  aria-label="展开导航"
                  onClick={() => setSidebar(true)}
                >
                  <Menu size={19} />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-sm font-medium">{demo.name}</h1>
                <button type="button" className="chat-profile-trigger -ml-1 mt-0.5 flex min-h-7 w-max max-w-full items-center gap-1 rounded-md px-1 text-[10px] text-[#8b93a1]"
                  aria-label={`查看或切换角色：${profile.name}`} aria-controls="chat-profile-panel" aria-expanded={inspector}
                  onClick={showProfile}>
                  <span className="truncate">
                  {profile.name} · {contextLabel}
                  </span>
                  <ChevronDown size={11} className="shrink-0" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden items-center gap-1.5 text-[10px] text-[#a0a6b2] sm:flex">
                <span
                  className={`size-1.5 rounded-full ${connected ? "bg-[#77bba5]" : "bg-[#c9cdd5]"}`}
                />
                {connected === null
                  ? "连接中"
                  : connected
                    ? "已连接"
                    : "未连接"}
              </span>
              <button
                className="icon-button"
                aria-label="查看模拟数据"
                aria-controls="chat-profile-panel" aria-expanded={inspector}
                onClick={(event) => inspector ? closeInspector() : showProfile(event)}
              >
                <Database size={17} />
              </button>
              <a className="icon-button" href="https://github.com/chaobin0701/agent-studio" target="_blank" rel="noopener noreferrer" aria-label="查看 Agent Studio GitHub 仓库">
                <Github size={17} aria-hidden="true" />
              </a>
              <Link className="icon-button" href="/" aria-label="返回首页">
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </header>
          {loading ? (
            <div className="chat-empty">
              <Loader2 className="animate-spin text-[#bac3d2]" size={25} />
              <p className="mt-4 text-xs text-waterloo">正在读取对话…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-welcome">
              <div className="chat-welcome-inner">
                <span className="mb-3 grid size-10 place-items-center rounded-2xl bg-[#f0f5ff] text-primary">
                  <Bot size={23} strokeWidth={1.4} />
                </span>
                <h2 className="text-center text-[clamp(22px,3vw,28px)] font-medium tracking-tight">
                  你好，今天有什么想聊的？
                </h2>
                <p className="mt-2 max-w-xl text-center text-[13px] leading-6 text-[#66758c]">
                  {demo.description}
                </p>
                <div className="mt-4 w-full max-w-[760px]">
                  <SuggestedQuestions
                    key={demo.slug}
                    demo={demo.slug}
                    disabled={busy || connected !== true}
                    onSelect={setInput}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="chat-messages relative">
              <ChatContainerRoot className="h-full">
                <ChatContainerContent className="mx-auto max-w-[810px] gap-8 px-6 pt-7 pb-12">
                  {messages.map((message) => (
                    <Message
                      key={message.id}
                      className={`group flex-col gap-2 ${message.role === "user" ? "items-end" : "items-start"}`}
                    >
                      {message.role === "assistant" && (
                        <PublicActivity events={message.progressEvents} interactions={message.interactions} />
                      )}
                      {(message.content || !message.interactions?.length) && <MessageContent
                        markdown={message.role === "assistant"}
                        className={
                          message.role === "user"
                            ? "max-w-[85%] rounded-3xl bg-[#f1f3f6] px-5 py-3 text-[13px] leading-7"
                            : "min-w-0 max-w-full bg-transparent p-0"
                        }
                      >
                        {message.content ||
                          (busy ? "正在查询…" : "本轮没有完整回答。")}
                      </MessageContent>}
                      {message.role === "assistant" && !!message.uiBlocks?.length && <GenerativeUiBlocks blocks={message.uiBlocks}
                        disabled={busy || pending || loading || connected !== true || message.status !== "completed" || message.incomplete || message.refused}
                        receipts={uiReceipts}
                        onSubmit={async submission => {
                          const block = message.uiBlocks?.find(item => item.blockId === submission.blockId && item.revision === submission.revision);
                          if (!block) throw new Error("界面已变化，请刷新");
                          await send(submissionMessage(block, submission), submission);
                        }} />}
                      {message.role === "assistant" && message.interactions?.filter(interaction => interaction.status === "pending").map((interaction) => <ChatInteraction
                        key={interaction.id} interaction={interaction} disabled={busy || loading || !waiting}
                        submitting={respondingId === interaction.id} error={interactionErrors[interaction.id]}
                        onRespond={(value) => void respond(value)} />)}
                      {message.incomplete && (
                        <span className="text-[10px] text-amber-700">
                          未完成 · 请刷新状态
                        </span>
                      )}
                      {Boolean(message.citations?.length) && (
                        <div className="flex flex-wrap gap-2">
                          {[
                            ...new Set(
                              message
                                .citations!.map(
                                  (citation) =>
                                    citation.documentTitle ??
                                    citation.originalFilename,
                                )
                                .filter(Boolean),
                            ),
                          ].map((title) => (
                            <span
                              key={title}
                              className="rounded-full bg-[#f2f5fa] px-3 py-1 text-[10px] text-[#8592a7]"
                            >
                              {title}
                            </span>
                          ))}
                        </div>
                      )}
                      {message.content && (
                        <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <MessageAction
                            tooltip={
                              copied === message.id ? "已复制" : "复制内容"
                            }
                          >
                            <button
                              aria-label="复制消息"
                              className="icon-button !size-7"
                              onClick={() =>
                                void navigator.clipboard
                                  .writeText(message.content)
                                  .then(() => {
                                    setCopied(message.id);
                                    setTimeout(() => setCopied(""), 1500);
                                  })
                                  .catch(() =>
                                    setError("浏览器暂时无法复制内容"),
                                  )
                              }
                            >
                              {copied === message.id ? (
                                <Check size={13} />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          </MessageAction>
                        </MessageActions>
                      )}
                    </Message>
                  ))}
                </ChatContainerContent>
                <ScrollButton className="absolute right-5 bottom-4" />
              </ChatContainerRoot>
            </div>
          )}
          <div className="chat-composer">
            {followUps.length > 0 && (
              <section className="assistant-panel" aria-label="你可能还想问">
                <h2 className="assistant-followups-heading">你可能还想问</h2>
                <div className="assistant-followups">
                  {followUps.map((question) => (
                    <button
                      key={question}
                      type="button"
                      disabled={busy || loading || pending}
                      className="assistant-followup"
                      onClick={() => addFollowUp(question)}
                    >
                      <span>{question}</span><ArrowUpRight size={14} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </section>
            )}
            {progress && (
              <p
                aria-live="polite"
                className="mb-3 flex items-center gap-2 px-2 text-[11px] leading-6 text-[#959dab]"
              >
                <Loader2 size={12} className="shrink-0 animate-spin" />
                <span className="line-clamp-2">{progress}</span>
              </p>
            )}
            {error && (
              <div
                role="alert"
                className="mb-3 flex items-start justify-between gap-3 rounded-lg bg-[#fff7ed] px-4 py-3 text-xs leading-6 text-[#9d6f35]"
              >
                <span>{error}</span>
                {current && (
                  <button
                    className="flex shrink-0 items-center gap-1"
                    disabled={busy}
                    onClick={() => void loadThread(current.id)}
                  >
                    <RefreshCw size={12} />
                    刷新状态
                  </button>
                )}
              </div>
            )}
            {pending && recoverable && !waiting && !busy && (
              <button
                className="mb-3 mr-4 inline-flex items-center gap-2 text-xs text-primary"
                disabled={loading}
                onClick={() => void recover()}
              >
                <RefreshCw size={12} />
                恢复原请求
              </button>
            )}
            {pending && !error && !waiting && (
              <button
                className="mb-3 flex items-center gap-2 text-xs text-[#959dab]"
                onClick={() => current && void loadThread(current.id)}
              >
                <RefreshCw size={12} />
                执行结果尚未确认，点击刷新状态
              </button>
            )}
            {waiting && !busy && <p role="status" className="mb-3 px-2 text-sm leading-6 text-[#52627c]">正在等待你的回应，请在对话卡片中选择或填写。</p>}
            <PromptInput
              value={input}
              onValueChange={setInput}
              onSubmit={() => void send()}
              isLoading={busy}
              className="rounded-[24px] border-[#e4e7ed] p-3 shadow-[0_3px_18px_#1b2b4a05]"
            >
              <PromptInputTextarea
                aria-label="输入消息"
                onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                  if (
                    event.key === "Tab" &&
                    !event.shiftKey &&
                    !event.ctrlKey && !event.altKey && !event.metaKey && !event.repeat &&
                    !input.trim() &&
                    followUps.length > 0 &&
                    !event.nativeEvent.isComposing &&
                    event.keyCode !== 229
                  ) {
                    event.preventDefault();
                    setInput(followUps[0]);
                  }
                }}
                placeholder={
                  connected === false
                    ? "聊天服务尚未连接"
                    : !input.trim() && followUps.length > 0
                      ? followUps[0]
                      : "问一个问题，或者让助手帮你看看…"
                }
                maxLength={1600}
                disabled={busy || pending || loading || connected !== true}
                className="px-2 text-[13px]"
              />
              <PromptInputActions className="mt-1 justify-between">
                <div className="flex items-center gap-2">
                  <div
                    ref={contextMeterRef}
                    className={`context-meter-wrap${contextInfoOpen ? " is-open" : ""}`}
                    onClick={(event) => event.stopPropagation()}
                    onPointerEnter={(event) => { if (event.pointerType === "mouse") setContextInfoOpen(true); }}
                    onPointerLeave={(event) => {
                      if (event.pointerType === "mouse" && !event.currentTarget.contains(document.activeElement)) setContextInfoOpen(false);
                    }}
                    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setContextInfoOpen(false); }}
                  >
                    <button
                      type="button"
                      className="context-meter"
                      style={{ "--context-value": `${Math.max(0, Math.min(100, contextUsage?.usagePercent ?? 0))}%` } as CSSProperties}
                      aria-label={contextUsage ? `上下文占用 ${contextPercent}%，查看详情` : "上下文占用未知，查看详情"}
                      aria-expanded={contextInfoOpen}
                      aria-controls="chat-context-details"
                      aria-describedby={contextInfoOpen ? "chat-context-details" : undefined}
                      onFocus={() => setContextInfoOpen(true)}
                      onClick={() => setContextInfoOpen(true)}
                    >
                      <span>{contextUsage ? `${contextPercent}%` : "—"}</span>
                    </button>
                    <div id="chat-context-details" className="context-meter-popover" role="tooltip" aria-hidden={!contextInfoOpen}>
                      <strong>上下文容量</strong>
                      {(busy || pending) && contextUsage && <span>显示上次已完成调用的数据，本次回复完成后更新。</span>}
                      {contextUsage ? (
                        <span>模型窗口 {formatTokens(contextUsage.contextWindowTokens)} Token · 剩余 {formatTokens(contextUsage.remainingInputTokens)} Token</span>
                      ) : <span>尚无本次调用测量，占用比例未知。</span>}
                      {(quota?.requests || quota?.tokens) && (
                        <>
                          <strong>应用共享额度</strong>
                          <span>{quota.requests ? `今日剩余 ${formatTokens(quota.requests.remaining)} 次` : `今日剩余 ${formatTokens(quota.tokens!.remaining)} Token`}</span>
                          <span>重置于 {resetTime(quota)}（{quota.timezone}）</span>
                          {quota.tokens?.unsettled && <span>部分调用尚未结算，预留消耗已计入剩余量。</span>}
                        </>
                      )}
                    </div>
                  </div>
                  {quota?.requests && <span className="context-quota-label">今日剩余 {formatTokens(quota.requests.remaining)} 次</span>}
                </div>
                <PromptInputAction
                  tooltip={busy ? "停止接收（助手可能仍在执行）" : waiting ? "请先回应对话卡片" : !input.trim() && followUps.length > 0 ? "发送这条推荐追问" : "发送消息"}
                >
                  <button
                    aria-label={busy ? "停止接收" : "发送消息"}
                    className="grid size-8 place-items-center rounded-full bg-[#222a37] text-white transition-colors hover:bg-primary disabled:opacity-20"
                    disabled={
                      !busy &&
                      (outgoingText.length < 2 ||
                        pending ||
                        loading ||
                        connected !== true)
                    }
                    onClick={() =>
                      busy ? abort.current?.abort() : void send()
                    }
                  >
                    {busy ? (
                      <Square size={11} fill="currentColor" />
                    ) : (
                      <ArrowUp size={17} />
                    )}
                  </button>
                </PromptInputAction>
              </PromptInputActions>
            </PromptInput>
          </div>
        </main>
        {inspector && (
          <aside ref={inspectorRef} id="chat-profile-panel" className="chat-inspector" aria-label="角色与模拟资料" tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === "Escape") { event.stopPropagation(); closeInspector(); }
            }}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-medium">角色与模拟资料</h2>
              <button
                className="icon-button"
                aria-label="关闭数据面板"
                onClick={closeInspector}
              >
                <X size={17} />
              </button>
            </div>
            {(busy || loading || pending) && <p className="mb-4 rounded-lg bg-[#edf2fa] px-3 py-2 text-xs leading-6 text-waterloo" role="status">
              可以查看角色资料，当前回复结束并确认后即可切换。
            </p>}
            {isContoso ? (
              <ContosoData
                persona={persona}
                compact
                disabled={busy || loading || pending}
                onChange={(user, value) => newThread(user, value)}
              />
            ) : (
              <RobotData
                persona={persona}
                month={month}
                compact
                disabled={busy || loading || pending}
                onChange={(user, value) => newThread(user, value)}
              />
            )}
            <p className="mt-6 text-[10px] leading-6 text-[#9ba3b0]">
              {isContoso
                ? "切换模拟客户会开始一段新对话，已有会话保留在侧栏。"
                : "切换家庭或月份会开始一段新对话，已有会话保留在侧栏。"}
            </p>
          </aside>
        )}
      </div>
    </TooltipProvider>
  );
}
