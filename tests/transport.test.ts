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
        JSON.stringify([
          { id: "legacy-answer", role: "assistant", content: "旧会话内容", structured: { suggestedFollowUps: ["继续了解中文示例"] } },
        ]),
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
  assert.match(String(received[0].body.message), /模拟用户ID=1003/);
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
  assert.match(String(sent.body.message), /Contoso 模拟客户ID=1/);
  assert.match(String(sent.body.message), /姓名=张晨/);
  assert.match(String(sent.body.message), /金额币种=CNY/);
  assert.match(String(sent.body.userId), /visitor-a:contoso-outdoor:contoso-1/);
  assert.ok(
    !threads("visitor-a", "robot-assistant").some((t) => t.id === retail.id),
  );
  const legacyRetail = createThread("visitor-a", "contoso-outdoor", "contoso-1", "2023");
  const legacyRequestId = randomUUID();
  const legacyMessage = "旧订单问题\n\n[公开演示资料：Contoso 模拟客户ID=1；姓名=John Smith；样例购买记录年份=2023；金额币种=USD。]";
  beginRequest(legacyRetail.id, legacyRequestId, JSON.stringify({ userId: platformUser(legacyRetail), message: legacyMessage, stream: true }));
  finishRequest(legacyRequestId, "unknown");
  await recoverRequest(legacyRetail);
  assert.equal(received.at(-1)!.key, legacyRequestId);
  assert.equal(received.at(-1)!.body.message, legacyMessage, "Localization must not rewrite saved request bodies on recovery.");
  assert.equal(received.at(-1)!.body.stream, false);
});
