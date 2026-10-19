"use client";

// Zola's prompt-kit conversation, composer and message components, with a custom Agent Studio transport.
import { useEffect, useRef, useState, type MouseEvent } from "react";
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
  UserRound,
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
import { sseParser } from "@/lib/sse";
import type { Thread } from "@/lib/server/store";

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  incomplete?: boolean;
  progressEvents?: PublicProgress[];
  citations?: { documentTitle?: string; originalFilename?: string }[];
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
};
function PublicActivity({ events = [] }: { events?: PublicProgress[] }) {
  const tools = new Map<string, PublicProgress>();
  for (const event of events)
    if (event.stage === "tool" && event.tool) tools.set(event.tool, event);
  if (!tools.size) return null;
  return (
    <details className="mb-2 text-[10px] text-[#9aa2af]">
      <summary className="cursor-pointer select-none py-1">
        查看资料与工具过程 · {tools.size} 项
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [threadList, setThreadList] = useState<Thread[]>([]);
  const [current, setCurrent] = useState<Thread | null>(null);
  const [persona, setPersona] = useState(profilesForDemo(demo.slug)[0].id);
  const [month, setMonth] = useState(periodsForDemo(demo.slug)[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [copied, setCopied] = useState("");
  const abort = useRef<AbortController | null>(null);
  const inspectorRef = useRef<HTMLElement | null>(null);
  const inspectorTrigger = useRef<HTMLElement | null>(null);
  const generation = useRef(0);
  const profile = profileForDemo(demo.slug, persona)!;
  const isContoso = demo.slug === "contoso-outdoor";
  const contextLabel = isContoso ? "2023 年样例" : `${month} 示例`;
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
  async function loadThread(id: string) {
    const version = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const data = await readJson(
        await fetch(`/api/hub/threads/${id}`, { cache: "no-store" }),
      );
      if (generation.current !== version) return;
      setCurrent(data.thread);
      setPersona(data.thread.persona);
      setMonth(data.thread.month);
      setMessages(
        data.messages.map((message: ChatMessage) => ({
          ...message,
          content: publicText(message.content),
        })),
      );
      setPending(Boolean(data.pending));
      if (window.innerWidth < 768) setSidebar(false);
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
    fetch(`/api/hub/status?demo=${demo.slug}`)
      .then(readJson)
      .then((data) => {
        if (!disposed) setConnected(data.connected);
      })
      .catch(() => {
        if (!disposed) setConnected(false);
      });
    refreshList()
      .then((items) => {
        if (!disposed && items.length) void loadThread(items[0].id);
      })
      .catch((error) => {
        if (!disposed) setError(error.message);
      });
    return () => {
      disposed = true;
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
    setPending(false);
    setError("");
    setProgress("");
    setInput("");
    setPersona(nextPersona);
    setMonth(nextMonth);
    if (window.innerWidth < 768) setSidebar(false);
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
    if (!current || busy) return;
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
  async function send(text = input) {
    const message = text.trim();
    if (message.length < 2 || busy || pending || loading || connected !== true)
      return;
    if (message.length > 1600) {
      setError("消息最多 1600 个字符");
      return;
    }
    setBusy(true);
    setError("");
    setInput("");
    setProgress("正在连接助手…");
    const assistantId = crypto.randomUUID();
    const controller = new AbortController();
    abort.current = controller;
    let done = false;
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
          message,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "暂时无法发送");
      }
      if (!response.body) throw new Error("连接没有返回内容");
      const parser = sseParser(({ event, data }) => {
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
        if (event === "done") {
          done = true;
          setPending(false);
          setProgress("");
          setMessages((previous) =>
            previous.map((value) =>
              value.id === assistantId
                ? {
                    ...value,
                    content: String(data.answer ?? ""),
                    progressEvents:
                      (data.progressEvents as PublicProgress[] | undefined) ??
                      value.progressEvents,
                    citations: (data.citations ??
                      []) as ChatMessage["citations"],
                  }
                : value,
            ),
          );
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
      if (!done) throw new Error("连接已结束，结果尚未确认。请刷新会话状态。");
    } catch (error) {
      setPending(true);
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
    } finally {
      setBusy(false);
      setProgress("");
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
              href={`/projects/${projectForDemo(demo.slug)?.slug ?? "agent-studio"}`}
              className="flex items-center gap-2 px-2 text-xs text-[#888e9a]"
            >
              <ArrowLeft size={13} />
              查看项目详情
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
                <p className="mt-2 max-w-xl text-center text-[11px] leading-6 text-[#989eab]">
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
                        <PublicActivity events={message.progressEvents} />
                      )}
                      <MessageContent
                        markdown={message.role === "assistant"}
                        className={
                          message.role === "user"
                            ? "max-w-[85%] rounded-3xl bg-[#f1f3f6] px-5 py-3 text-[13px] leading-7"
                            : "min-w-0 max-w-full bg-transparent p-0"
                        }
                      >
                        {message.content ||
                          (busy ? "正在查询…" : "本轮没有完整回答。")}
                      </MessageContent>
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
            {messages.length > 0 && (
              <div className="mb-3">
                <button
                  type="button"
                  className="rounded-full bg-[#f4f7fb] px-3 py-1.5 text-[10px] text-[#8794a6] hover:text-primary"
                  aria-expanded={showSuggestions}
                  onClick={() => setShowSuggestions((value) => !value)}
                >
                  {showSuggestions ? "收起推荐问题" : "推荐问题"}
                </button>
                {showSuggestions && (
                  <div className="mt-3 max-h-[300px] overflow-y-auto rounded-xl border border-[#edf0f5] p-3">
                    <SuggestedQuestions
                      key={demo.slug}
                      demo={demo.slug}
                      disabled={busy || loading || pending}
                      onSelect={setInput}
                    />
                  </div>
                )}
              </div>
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
            {pending && !busy && (
              <button
                className="mb-3 mr-4 inline-flex items-center gap-2 text-xs text-primary"
                disabled={loading}
                onClick={() => void recover()}
              >
                <RefreshCw size={12} />
                恢复原请求
              </button>
            )}
            {pending && !error && (
              <button
                className="mb-3 flex items-center gap-2 text-xs text-[#959dab]"
                onClick={() => current && void loadThread(current.id)}
              >
                <RefreshCw size={12} />
                执行结果尚未确认，点击刷新状态
              </button>
            )}
            <PromptInput
              value={input}
              onValueChange={setInput}
              onSubmit={() => void send()}
              isLoading={busy}
              className="rounded-[24px] border-[#e4e7ed] p-3 shadow-[0_3px_18px_#1b2b4a05]"
            >
              <PromptInputTextarea
                aria-label="输入消息"
                placeholder={
                  connected === false
                    ? "聊天服务尚未连接"
                    : "问一个问题，或者让助手帮你看看…"
                }
                maxLength={1600}
                disabled={busy || pending || loading || connected !== true}
                className="px-2 text-[13px]"
              />
              <PromptInputActions className="mt-1 justify-between">
                <button
                  type="button"
                  className="chat-profile-trigger flex min-h-8 min-w-0 items-center gap-2 rounded-full px-2 py-1 text-[10px] text-[#8b93a1]"
                  aria-label={`查看或切换角色：${profile.name}`} aria-controls="chat-profile-panel" aria-expanded={inspector}
                  onClick={showProfile}
                >
                  <UserRound size={13} className="shrink-0" />
                  <span className="truncate">{profile.name} · {contextLabel}</span>
                  <ChevronDown size={11} className="shrink-0" aria-hidden="true" />
                </button>
                <PromptInputAction
                  tooltip={busy ? "停止接收（助手可能仍在执行）" : "发送消息"}
                >
                  <button
                    aria-label={busy ? "停止接收" : "发送消息"}
                    className="grid size-8 place-items-center rounded-full bg-[#222a37] text-white transition-colors hover:bg-primary disabled:opacity-20"
                    disabled={
                      !busy &&
                      (input.trim().length < 2 ||
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
            <p className="mt-3 text-center text-[9px] leading-5 text-[#a8aeba]">
              {busy
                ? "停止接收只关闭当前显示，助手可能继续执行。"
                : `AI 回答可能存在偏差，请结合资料判断。${demo.disclaimer}`}
            </p>
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
