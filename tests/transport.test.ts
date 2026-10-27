import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  createThread,
  thread,
  db,
  pending,
  savedRequest,
  finishRequest,
  beginRequest,
  threads,
} from "../lib/server/store";
import {
  platformUser,
  sendMessage,
  recoverRequest,
  history,
  conversationConfigurations,
} from "../lib/server/agent-studio";
import { publicText } from "../lib/public-text";

test("thread ownership, Demo routing, native streaming and idempotent first-turn replay", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "agent-studio-showcase-test-"));
  process.env.HUB_DATA_DIR = directory;
  const received: {
    key: string;
    body: Record<string, unknown>;
    url?: string;
    authorization?: string;
  }[] = [];
  const historyUsers: string[] = [];
  let historyMessages: {
    id: string;
    role: string;
    content: string;
    structured?: unknown;
    context?: unknown;
  }[] = [
    { id: "legacy-answer", role: "assistant", content: "旧会话内容", structured: { suggestedFollowUps: ["继续了解中文示例"] } },
  ];
  const conversationId = randomUUID();
  let finishDelayed: (() => void) | undefined;
  const delayedFinished = new Promise<void>((resolve) => {
    finishDelayed = resolve;
  });
  const server = createServer(async (request, response) => {
    if (request.method === "GET" && request.url?.includes('/configurations?')) {
      assert.equal(request.headers.authorization, 'Bearer test-only-key');
      historyUsers.push(new URL(request.url, 'http://localhost').searchParams.get('userId')!);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({turns:[{id:'recorded',number:1,status:'completed',snapshot:{agent:{name:'助手',version:'v3'},tools:[],skills:[{name:'故障排查',version:'v1'}],mcp:[],knowledge:[]}}]}));
      return;
    }
    if (request.method === "GET") {
      historyUsers.push(
        new URL(request.url!, "http://localhost").searchParams.get("userId")!,
      );
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify(request.url?.includes("/runs?") ? [] : historyMessages),
      );
      return;
    }
    let body = "";
    for await (const chunk of request) body += chunk;
    received.push({
      key: String(request.headers["idempotency-key"]),
      body: JSON.parse(body),
      url: request.url,
      authorization: request.headers.authorization,
    });
    if (JSON.parse(body).stream === false) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ conversationId, answer: "模拟回答" }));
      return;
    }
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.write(
      `event: run_started\ndata: ${JSON.stringify({ conversationId })}\n\n`,
    );
    response.write('event: answer_delta\ndata: {"text":"模拟"}\n\n');
    const complete = () =>
      response.end(
        `event: done\ndata: ${JSON.stringify({ conversationId, answer: "模拟回答", structured: { suggestedFollowUps: ["继续了解中文示例"] } })}\n\n`,
      );
    if (body.includes("停止接收测试"))
      setTimeout(() => {
        complete();
        finishDelayed!();
      }, 20);
    else complete();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  process.env.AGENT_STUDIO_BASE_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  process.env.AGENT_STUDIO_API_KEY = "test-only-key";
  t.after(async () => {
    db().close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  });
  const first = createThread("visitor-a", "robot-report", "1003", "2025-12");
  assert.throws(() => thread("visitor-b", first.id));
  assert.throws(() => thread("visitor-a", first.id, "unrelated-demo"));
  assert.equal(
    thread("visitor-a", first.id, "robot-assistant").demo,
    "robot-report",
  );
  const other = createThread("visitor-a", "robot-weather", "1003", "2025-12");
  assert.notEqual(platformUser(first), platformUser(other));
  const requestId = randomUUID();
  const response = await sendMessage(first, "请生成清洁报告", requestId);
  const live = await response.text();
  assert.match(live, /模拟回答/);
  assert.match(live, /suggestedFollowUps/);
  const restored = thread("visitor-a", first.id);
  assert.equal(restored.upstream_id, conversationId);
  assert.equal(pending(first.id), undefined);
  assert.equal(savedRequest(requestId)!.state, "completed");
  const replay = await sendMessage(restored, "请生成清洁报告", requestId);
  await replay.text();
  assert.deepEqual(received[0], received[1]);
  assert.equal(
    received[0].body.conversationId,
    undefined,
    "first-turn replay must not add the new upstream conversation ID",
  );
  assert.match(String(received[0].body.userId), /visitor-a:robot-report:1003/);
  assert.equal(received[0].body.message, "请生成清洁报告");
  assert.deepEqual(received[0].body.context, { data: {
    demo: "robot-assistant", userId: "1003", userName: "周一鸣", month: "2025-12",
  } });
  assert.deepEqual(JSON.parse(savedRequest(requestId)!.body), received[0].body);
  await assert.rejects(
    sendMessage(restored, "换一个问题", requestId),
    /请求标识已用于其他内容/,
  );
  finishRequest(requestId, "unknown");
  assert.deepEqual(await recoverRequest(restored), { recovered: true });
  assert.equal(savedRequest(requestId)!.state, "completed");
  assert.equal(received[2].key, received[0].key);
  assert.deepEqual(received[2].body, { ...received[0].body, stream: false });
  const oldHistory = await history(
    thread("visitor-a", first.id, "robot-assistant"),
  );
  assert.equal(oldHistory.messages[0].content, "旧会话内容");
  assert.deepEqual(oldHistory.messages[0].structured, { suggestedFollowUps: ["继续了解中文示例"] });
  assert.equal(historyUsers[0], "hub:visitor-a:robot-report:1003");
  const stopped = createThread("visitor-a", "robot-weather", "1001", "2025-12");
  const stoppedId = randomUUID();
  const stoppedResponse = await sendMessage(stopped, "停止接收测试", stoppedId);
  const stoppedReader = stoppedResponse.body!.getReader();
  await stoppedReader.read();
  await stoppedReader.cancel();
  await delayedFinished;
  for (
    let attempts = 0;
    attempts < 100 && savedRequest(stoppedId)?.state !== "completed";
    attempts++
  )
    await new Promise((resolve) => setTimeout(resolve, 1));
  assert.equal(
    savedRequest(stoppedId)?.state,
    "completed",
    "browser cancellation must not mark a still-running Agent as cancelled or lose its result",
  );
  assert.equal(thread("visitor-a", stopped.id).upstream_id, conversationId);
  const canonical = createThread(
    "visitor-a",
    "robot-assistant",
    "1001",
    "2025-12",
  );
  createThread("visitor-b", "robot-report", "1001", "2025-12");
  createThread("visitor-a", "unrelated-demo", "1001", "2025-12");
  const combined = threads("visitor-a", "robot-assistant");
  assert.deepEqual(
    new Set(combined.map((item) => item.id)),
    new Set([first.id, other.id, stopped.id, canonical.id]),
  );
  assert.equal(
    platformUser(combined.find((item) => item.id === first.id)!),
    "hub:visitor-a:robot-report:1003",
  );
  const recorded = await conversationConfigurations(thread("visitor-a", first.id));
  assert.equal(recorded.turns[0].snapshot.agent.version, "v3");
  assert.equal(recorded.turns[0].snapshot.skills[0].version, "v1");
  assert.equal(historyUsers.at(-1), platformUser(first));
  const empty = createThread("visitor-a", "robot-assistant", "1001", "2025-12");
  assert.deepEqual(await conversationConfigurations(empty), {turns:[]});
  process.env.AGENT_STUDIO_CONTOSO_API_KEY = "contoso-test-key";
  process.env.AGENT_STUDIO_CONTOSO_AGENT_ID = "77";
  const retail = createThread(
    "visitor-a",
    "contoso-outdoor",
    "contoso-1",
    "2023",
  );
  assert.throws(() => thread("visitor-a", retail.id, "robot-assistant"));
  assert.throws(() => thread("visitor-b", retail.id, "contoso-outdoor"));
  await (await sendMessage(retail, "看看我的模拟订单", randomUUID())).text();
  const sent = received.at(-1)!;
  assert.equal(sent.url, "/v1/agent/77/messages");
  assert.equal(sent.authorization, "Bearer contoso-test-key");
  assert.equal(sent.body.message, "看看我的模拟订单");
  assert.deepEqual(sent.body.context, { data: {
    demo: "contoso-outdoor", customerId: "1", customerName: "张晨", year: 2023, currency: "CNY",
  } });
  assert.deepEqual(JSON.parse(savedRequest(sent.key)!.body), sent.body);
  assert.match(String(sent.body.userId), /visitor-a:contoso-outdoor:contoso-1/);
  assert.ok(
    !threads("visitor-a", "robot-assistant").some((t) => t.id === retail.id),
  );
  for (const fixture of [
    {
      demo: "robot-report", persona: "1001", period: "2025-06",
      question: "旧清洁问题",
      suffix: "模拟用户ID=1001；姓名=旧姓名；示例月份=2025-06。这些是待查询的数据标识，非真实身份或已核实的使用记录。",
      data: { demo: "robot-assistant", userId: "1001", userName: "林小北", month: "2025-06" },
    },
    {
      demo: "contoso-outdoor", persona: "contoso-1", period: "2023",
      question: "旧订单问题",
      suffix: "Contoso 模拟客户ID=1；姓名=John Smith；样例购买记录年份=2023；金额币种=USD。",
      data: { demo: "contoso-outdoor", customerId: "1", customerName: "张晨", year: 2023, currency: "CNY" },
    },
  ]) {
    const legacy = createThread("visitor-a", fixture.demo, fixture.persona, fixture.period);
    const legacyRequestId = randomUUID();
    const legacyMessage = `${fixture.question}\n\n[公开演示资料：${fixture.suffix}]`;
    const originalBody = JSON.stringify({ userId: platformUser(legacy), message: legacyMessage, stream: true });
    beginRequest(legacy.id, legacyRequestId, originalBody);
    finishRequest(legacyRequestId, "unknown");

    await recoverRequest(legacy);
    assert.equal(received.at(-1)!.key, legacyRequestId);
    assert.deepEqual(received.at(-1)!.body, { ...JSON.parse(originalBody), stream: false });
    assert.equal(savedRequest(legacyRequestId)!.body, originalBody);

    const reloaded = thread("visitor-a", legacy.id);
    await (await sendMessage(reloaded, fixture.question, legacyRequestId)).text();
    assert.equal(received.at(-1)!.key, legacyRequestId);
    assert.deepEqual(received.at(-1)!.body, JSON.parse(originalBody), "Retry must retain the original legacy payload, including its old name and currency.");
    await assert.rejects(sendMessage(reloaded, "更改的问题", legacyRequestId), /请求标识已用于其他内容/);

    const nextQuestion = "继续查看我的模拟记录";
    const nextId = randomUUID();
    await (await sendMessage(reloaded, nextQuestion, nextId)).text();
    const nextBody = received.at(-1)!.body;
    assert.equal(nextBody.message, nextQuestion);
    assert.equal(nextBody.conversationId, conversationId);
    assert.deepEqual(nextBody.context, { data: fixture.data });
    assert.deepEqual(JSON.parse(savedRequest(nextId)!.body), nextBody);
    finishRequest(nextId, "unknown");
    await recoverRequest(reloaded);
    assert.deepEqual(received.at(-1)!.body, { ...nextBody, stream: false });
    assert.deepEqual(JSON.parse(savedRequest(nextId)!.body), nextBody);

    historyMessages = [
      { id: "legacy-user", role: "user", content: legacyMessage },
      { id: "new-user", role: "user", content: nextQuestion, context: nextBody.context },
    ];
    const refreshed = await history(reloaded);
    assert.equal(refreshed.messages[0].content, legacyMessage, "History must not rewrite upstream messages.");
    assert.equal(refreshed.messages[0].context, undefined);
    assert.deepEqual(refreshed.messages[1].context, { data: fixture.data });
    assert.deepEqual(refreshed.messages.map((item: { content: string }) => publicText(item.content)), [fixture.question, nextQuestion]);
    assert.equal(savedRequest(legacyRequestId)!.body, originalBody);
  }
});
