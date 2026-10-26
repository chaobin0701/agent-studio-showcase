import type { UiSubmission } from "../generative-ui/actions";
import { HttpError } from "./security";
import {
  beginRequest,
  uiReceipts,
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
import {
  interactionResponseSchema,
  type ChatInteraction,
  type ChatInteractionResponse,
} from "../interactions";

type UpstreamRun = {
  id: string;
  integrationCallId?: string;
  assistantMessageId?: number | null;
  clientRequestId: string;
  question?: string;
  status: string;
  errorCode?: string;
  createdAt?: string;
  interactions?: ChatInteraction[];
};
async function runsForThread(thread: Thread): Promise<UpstreamRun[]> {
  if (!thread.upstream_id) return [];
  const query = new URLSearchParams({ userId: platformUser(thread) });
  return (
    await agentRequest(
      `/v1/agent/conversations/${thread.upstream_id}/runs?${query}`,
      {},
      thread.demo,
    )
  ).json();
}

export function connected(demo = "robot-assistant") {
  const connection = demoConnection(demo);
  return Boolean(connection.agentId && connection.apiKey);
}
export async function chatStatus(demo = "robot-assistant") {
  if (!connected(demo)) return { connected: false, quota: null };
  try {
    const response = await agentRequest("/v1/agent/chat-status", {}, demo);
    const result = await response.json();
    return { connected: true, quota: result.quota ?? null };
  } catch {
    // Optional quota visibility must not mark an otherwise configured chat as disconnected.
    return { connected: true, quota: null };
  }
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
export async function conversationConfigurations(thread: Thread) {
  if (!thread.upstream_id) return { turns: [] };
  const query = new URLSearchParams({ userId: platformUser(thread) });
  return (await agentRequest(`/v1/agent/conversations/${thread.upstream_id}/configurations?${query}`, {}, thread.demo)).json();
}

export async function history(thread: Thread) {
  const active = pending(thread.id);
  if (!thread.upstream_id) return { messages: [], pending: active ?? null, uiReceipts: uiReceipts(thread.id) };
  const query = new URLSearchParams({ userId: platformUser(thread) });
  const runs = await runsForThread(thread);
  if (active) {
    const run = runs.find((item) => item.clientRequestId === active.request_id);
    if (run && run.status !== "running")
      finishRequest(
        active.request_id,
        run.status === "waiting"
          ? "waiting"
          : run.status === "completed"
            ? "completed"
            : "failed",
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
  for (const run of runs) {
    const assistant =
      run.assistantMessageId == null
        ? undefined
        : messages.find(
            (message: { id: string | number; role: string }) =>
              message.role === "assistant" &&
              String(message.id) === String(run.assistantMessageId),
          );
    if (assistant) {
      assistant.status = run.status;
      assistant.runId = run.integrationCallId;
      if (!run.interactions?.length) continue;
      assistant.interactions = run.interactions;
    } else {
      if (!run.interactions?.length) continue;
      // A waiting legacy run has not saved its ordinary user/assistant pair yet.
      const delivery = savedRequest(run.clientRequestId);
      if (delivery?.thread_id !== thread.id) continue;
      messages.push({
        id: `interaction-user:${run.id}`,
        role: "user",
        content: run.question ?? JSON.parse(delivery.body).message,
        createdAt: run.createdAt,
      });
      messages.push({
        id: `interaction-run:${run.id}`,
        role: "assistant",
        content: "",
        runId: run.integrationCallId,
        status: run.status,
        interactions: run.interactions,
        createdAt: run.createdAt,
      });
    }
  }
  messages.sort((a: { createdAt?: string }, b: { createdAt?: string }) =>
    a.createdAt && b.createdAt
      ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      : 0,
  );
  return { messages, pending: pending(thread.id) ?? null, uiReceipts: uiReceipts(thread.id) };
}
export async function recoverRequest(thread: Thread) {
  if (thread.upstream_id) await history(thread);
  const active = pending(thread.id);
  if (!active) return { recovered: false };
  if (active.state === "waiting")
    throw new HttpError(409, "请回应对话中的卡片，无需恢复原请求");
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
  finishRequest(
    active.request_id,
    result.status === "waiting" || result.interaction ? "waiting" : "completed",
  );
  return { recovered: true };
}
export async function sendMessage(
  thread: Thread,
  message: string,
  requestId: string,
  submission?: UiSubmission,
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
  const old = beginRequest(thread.id, requestId, body, submission);
  if (old?.state === "running" || old?.state === "waiting")
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
  return relayAgentStream(response, thread, requestId);
}

export async function respondToInteraction(
  thread: Thread,
  value: ChatInteractionResponse,
) {
  const parsed = interactionResponseSchema.safeParse(value);
  if (!parsed.success) throw new HttpError(400, "交互答复格式错误");
  const runs = await runsForThread(thread);
  const run = runs.find((item) =>
    item.interactions?.some((i) => i.id === parsed.data.interactionId),
  );
  const interaction = run?.interactions?.find(
    (i) => i.id === parsed.data.interactionId,
  );
  const delivery = run && savedRequest(run.clientRequestId);
  if (
    !run ||
    !interaction ||
    !thread.upstream_id ||
    !delivery ||
    delivery.thread_id !== thread.id
  )
    throw new HttpError(404, "交互请求不存在");
  if (
    interaction.kind !== parsed.data.kind ||
    (interaction.status === "pending" &&
      interaction.revision !== parsed.data.revision)
  )
    throw new HttpError(409, "交互请求已变化，请刷新会话");
  // Resolution increments the server revision. Completed responses must reach
  // the upstream fingerprint check with their original revision for replay.
  const query = new URLSearchParams({ userId: platformUser(thread) });
  let response: Response;
  try {
    response = await agentRequest(
      `/v1/agent/conversations/${thread.upstream_id}/interactions/${interaction.id}/respond?${query}`,
      { method: "POST", body: JSON.stringify(parsed.data) },
      thread.demo,
    );
  } catch (error) {
    if (!(error instanceof HttpError) || error.status >= 500)
      finishRequest(delivery.request_id, "unknown");
    throw error;
  }
  finishRequest(delivery.request_id, "running");
  if (response.headers.get("content-type")?.includes("application/json")) {
    const replay = await response.json();
    if (replay.replayed !== true) {
      finishRequest(delivery.request_id, "unknown");
      throw new HttpError(502, "交互服务返回了未识别的确认结果");
    }
    // A duplicate response can acknowledge a still-running original resume.
    // Reconcile its durable status; a JSON acknowledgement is never `done`.
    await history(thread).catch(() => {});
    return Response.json(
      { replayed: true, runId: replay.runId },
      { status: 202 },
    );
  }
  return relayAgentStream(response, thread, delivery.request_id);
}

export async function cancelInteraction(thread: Thread, interactionId: string) {
  const runs = await runsForThread(thread);
  const run = runs.find((item) =>
    item.interactions?.some((interaction) => interaction.id === interactionId),
  );
  const interaction = run?.interactions?.find(
    (item) => item.id === interactionId,
  );
  const delivery = run && savedRequest(run.clientRequestId);
  if (
    !run ||
    !interaction ||
    interaction.kind !== "question" ||
    !thread.upstream_id ||
    !delivery ||
    delivery.thread_id !== thread.id
  )
    throw new HttpError(404, "交互请求不存在");
  const query = new URLSearchParams({ userId: platformUser(thread) });
  try {
    await agentRequest(
      `/v1/agent/conversations/${thread.upstream_id}/interactions/${interaction.id}/cancel?${query}`,
      { method: "POST" },
      thread.demo,
    );
  } catch (error) {
    if (!(error instanceof HttpError) || error.status >= 500)
      finishRequest(delivery.request_id, "unknown");
    throw error;
  }
  finishRequest(delivery.request_id, "failed", "interaction_cancelled");
  return { cancelled: true };
}

function relayAgentStream(
  response: Response,
  thread: Thread,
  requestId: string,
) {
  if (
    !response.body ||
    !response.headers.get("content-type")?.includes("text/event-stream")
  ) {
    finishRequest(requestId, "unknown");
    throw new HttpError(502, "聊天服务没有返回事件流");
  }
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
          if (event === "interaction_required") {
            terminal = true; // Waiting is a settled delivery, not a completed task.
            finishRequest(requestId, "waiting");
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
