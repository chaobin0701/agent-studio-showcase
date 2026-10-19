import { HttpError } from "./security";
import {
  beginRequest,
  finishRequest,
  pending,
  savedRequest,
  setTitle,
  setUpstream,
  type Thread,
} from "./store";
import { sseParser } from "../sse";
import { profileForDemo } from "../demo-profiles";
import { canonicalDemoSlug } from "../catalog";
import { demoConnection } from "./connections";

export function connected(demo = "robot-assistant") {
  const connection = demoConnection(demo);
  return Boolean(connection.agentId && connection.apiKey);
}
export function platformUser(thread: Thread) {
  // Keep the original Demo identity of legacy conversations. Canonicalizing
  // this field would change upstream ownership and orphan existing history.
  return `hub:${thread.owner}:${thread.demo}:${thread.persona}`;
}
export async function agentRequest(
  path: string,
  options: RequestInit = {},
  demo = "robot-assistant",
) {
  if (!connected(demo))
    throw new HttpError(
      503,
      "聊天服务尚未连接，请配置 Agent Studio 服务端接入密钥。",
    );
  const base = process.env.AGENT_STUDIO_BASE_URL ?? "http://127.0.0.1:3020/api";
  const response = await fetch(base + path, {
    ...options,
    cache: "no-store",
    headers: {
      authorization: `Bearer ${demoConnection(demo).apiKey}`,
      "content-type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(180000),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new HttpError(
      response.status,
      payload.error?.message ??
        payload.message ??
        `聊天服务返回 ${response.status}`,
    );
  }
  return response;
}
export async function history(thread: Thread) {
  const active = pending(thread.id);
  if (!thread.upstream_id) return { messages: [], pending: active ?? null };
  const query = new URLSearchParams({ userId: platformUser(thread) });
  if (active) {
    const runs = await (
      await agentRequest(
        `/v1/agent/conversations/${thread.upstream_id}/runs?${query}`,
        {},
        thread.demo,
      )
    ).json();
    const run = runs.find(
      (item: { clientRequestId: string }) =>
        item.clientRequestId === active.request_id,
    );
    if (run && run.status !== "running")
      finishRequest(
        active.request_id,
        run.status === "completed" ? "completed" : "failed",
        run.errorCode ?? null,
      );
  }
  const messages = await (
    await agentRequest(
      `/v1/agent/conversations/${thread.upstream_id}/messages?${query}`,
      {},
      thread.demo,
    )
  ).json();
  return { messages, pending: pending(thread.id) ?? null };
}
export async function recoverRequest(thread: Thread) {
  const active = pending(thread.id);
  if (!active) return { recovered: false };
  // Explicit user action only. Preserve the original body and idempotency key,
  // including the absent conversationId on an unconfirmed first turn.
  const response = await agentRequest(
    `/v1/agent/${demoConnection(thread.demo).agentId}/messages`,
    {
      method: "POST",
      headers: { "Idempotency-Key": active.request_id },
      body: JSON.stringify({ ...JSON.parse(active.body), stream: false }),
    },
    thread.demo,
  );
  const result = await response.json();
  if (typeof result.conversationId === "string")
    setUpstream(thread.id, result.conversationId);
  finishRequest(active.request_id, "completed");
  return { recovered: true };
}
export async function sendMessage(
  thread: Thread,
  message: string,
  requestId: string,
) {
  const profile = profileForDemo(thread.demo, thread.persona);
  if (!profile) throw new HttpError(400, "无效的模拟背景");
  const contextual =
    canonicalDemoSlug(thread.demo) === "contoso-outdoor"
      ? `${message}\n\n[公开演示资料：Contoso 模拟客户ID=${thread.persona.replace(/^contoso-/, "")}；姓名=${profile.name}；样例购买记录年份=2023；金额币种=CNY；采用中文名称及独立人民币模拟定价，2023 年记录金额已按该价重算。历史美元消息保留原币种，不当作当前人民币报价。客户为虚构样例，不是真实账户；请使用工具查询，不推测订单或会员权益。]`
      : `${message}\n\n[公开演示资料：模拟用户ID=${profile.id}；姓名=${profile.name}；示例月份=${thread.month}。这些是待查询的数据标识，非真实身份或已核实的使用记录。]`;
  const saved = savedRequest(requestId);
  if (
    saved &&
    (saved.thread_id !== thread.id ||
      JSON.parse(saved.body).message !== contextual)
  )
    throw new HttpError(409, "请求标识已用于其他内容");
  if (saved?.state === "failed")
    throw new HttpError(409, "该请求已失败，请确认后重新发送");
  const body =
    saved?.body ??
    JSON.stringify({
      userId: platformUser(thread),
      message: contextual,
      ...(thread.upstream_id ? { conversationId: thread.upstream_id } : {}),
      stream: true,
    });
  const old = beginRequest(thread.id, requestId, body);
  if (old?.state === "running")
    throw new HttpError(409, "消息正在执行，请刷新状态");
  let response: Response;
  try {
    response = await agentRequest(
      `/v1/agent/${demoConnection(thread.demo).agentId}/messages`,
      { method: "POST", headers: { "Idempotency-Key": requestId }, body },
      thread.demo,
    );
  } catch (error) {
    finishRequest(
      requestId,
      error instanceof HttpError && error.status < 500 && error.status !== 409
        ? "failed"
        : "unknown",
      error instanceof Error ? error.message : "连接中断",
    );
    throw error;
  }
  if (
    !response.body ||
    !response.headers.get("content-type")?.includes("text/event-stream")
  ) {
    finishRequest(requestId, "unknown");
    throw new HttpError(502, "聊天服务没有返回事件流");
  }
  setTitle(thread.id, message);
  let disconnected = false;
  let terminal = false;
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        const emit = (value: Uint8Array) => {
          if (!disconnected)
            try {
              controller.enqueue(value);
            } catch {
              disconnected = true;
            }
        };
        const parser = sseParser(({ event, data }) => {
          if (
            (event === "run_started" || event === "done") &&
            typeof data.conversationId === "string"
          )
            setUpstream(thread.id, data.conversationId);
          if (event === "done" || event === "error") {
            terminal = true;
            finishRequest(
              requestId,
              event === "done" ? "completed" : "failed",
              event === "error" ? String(data.message ?? "执行失败") : null,
            );
          }
        });
        const reader = response.body!.getReader();
        try {
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            parser.push(part.value);
            emit(part.value);
          }
          parser.end();
          if (!terminal) {
            finishRequest(requestId, "unknown");
            emit(
              encoder.encode(
                'event: error\ndata: {"message":"连接已结束，结果尚未确认，请刷新会话状态。"}\n\n',
              ),
            );
          }
        } catch {
          if (!terminal) {
            finishRequest(requestId, "unknown");
            emit(
              encoder.encode(
                'event: error\ndata: {"message":"连接中断，请刷新会话状态。"}\n\n',
              ),
            );
          }
        } finally {
          reader.releaseLock();
          if (!disconnected) controller.close();
        }
      },
      cancel() {
        disconnected = true;
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    },
  );
}
