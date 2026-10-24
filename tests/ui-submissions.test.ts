import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createThread, db, setUpstream, uiReceipts, pending, beginRequest, finishRequest, savedRequest, removeThread } from "../lib/server/store";
import { history, recoverRequest } from "../lib/server/agent-studio";
import { submitUi } from "../lib/server/ui-submissions";
import { previewBlocks } from "../lib/generative-ui/examples";

test("owned persisted UI submissions survive history, resist forgery and retain request idempotency", async t => {
  const directory = mkdtempSync(join(tmpdir(), "agent-ui-test-"));
  process.env.HUB_DATA_DIR = directory;
  process.env.AGENT_STUDIO_API_KEY = "test-only-key";
  const conversationId = randomUUID();
  const requests: { body: Record<string, unknown>; key: string }[] = [];
  let status = "completed";
  let disconnect = false;
  const server = createServer(async (request, response) => {
    if (request.method === "GET") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(request.url?.includes("/runs?") ? [] : [
        { id: "answer", role: "assistant", content: "选择偏好", status, uiBlocks: previewBlocks },
      ]));
      return;
    }
    let raw = ""; for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw);
    requests.push({ body, key: String(request.headers["idempotency-key"]) });
    if (disconnect) { request.socket.destroy(); return; }
    if (!body.stream) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ conversationId, answer: "已恢复" })); return;
    }
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.end(`event: done\ndata: ${JSON.stringify({ conversationId, answer: "已收到" })}\n\n`);
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  process.env.AGENT_STUDIO_BASE_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  t.after(async () => { db().close(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); rmSync(directory, { recursive: true, force: true }); });
  const thread = createThread("visitor-a", "robot-assistant", "1003", "2025-12");
  setUpstream(thread.id, conversationId); thread.upstream_id = conversationId;
  const choice = { blockId: previewBlocks[17].blockId, revision: 1, componentId: "format", values: { selection: ["summary"] } };
  status = "running";
  await assert.rejects(submitUi(thread, choice, randomUUID()), /界面已变化或不存在/);
  status = "completed";
  for (const bad of [{ ...choice, revision: 2 }, { ...choice, blockId: "other-conversation" }, { ...choice, componentId: "forged" }, { ...choice, values: { selection: ["forged"] } }])
    await assert.rejects(submitUi(thread, bad, randomUUID()));
  assert.equal(requests.length, 0);
  const id = randomUUID();
  await (await submitUi(thread, choice, id)).text();
  assert.match(String(requests[0].body.message), /我的选择：简要摘要/);
  assert.equal(requests[0].body.uiSubmission, undefined);
  assert.equal(pending(thread.id), undefined);
  assert.deepEqual((await history(thread)).uiReceipts, [{ ...choice, state: "completed" }]);
  await assert.rejects(submitUi(thread, choice, randomUUID()), /已经提交/);
  assert.equal(requests.length, 1);
  await (await submitUi(thread, choice, id)).text();
  assert.equal(requests[1].key, id);
  assert.equal(uiReceipts(thread.id).length, 1);
  await assert.rejects(submitUi(thread, { ...choice, values: { selection: ["details"] } }, id), /请求标识已用于/);
  const foreign = createThread("visitor-b", "robot-assistant", "1003", "2025-12");
  await assert.rejects(submitUi(foreign, choice, randomUUID()), /界面已变化或不存在/);
  await assert.rejects(submitUi(foreign, choice, id), /其他会话/);

  const action = { blockId: previewBlocks[18].blockId, revision: 1, componentId: "continue" };
  const uncertainId = randomUUID(); disconnect = true;
  await assert.rejects(submitUi(thread, action, uncertainId));
  assert.equal(uiReceipts(thread.id)[1].state, "unknown");
  await assert.rejects(submitUi(thread, action, randomUUID()), /先完成或恢复/);
  disconnect = false;
  await recoverRequest(thread);
  assert.equal(requests.at(-1)?.key, uncertainId);
  assert.equal(uiReceipts(thread.id)[1].state, "completed");
  await assert.rejects(submitUi(thread, action, randomUUID()), /已经提交/);

  // Failed duplicate insertion rolls back the request and leaves no orphan delivery.
  const failedId = randomUUID();
  assert.throws(() => beginRequest(thread.id, failedId, "{}", choice), /已经提交/);
  assert.equal(savedRequest(failedId), undefined);
  const normal = randomUUID(); beginRequest(thread.id, normal, "{}"); finishRequest(normal, "completed");
  assert.throws(() => beginRequest(thread.id, normal, "{}", action), /请求标识已用于/);
  removeThread(thread.id);
  assert.deepEqual(uiReceipts(thread.id), []);
});
