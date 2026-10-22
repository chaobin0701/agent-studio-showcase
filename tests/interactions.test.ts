import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createThread, db, pending, thread } from "../lib/server/store";
import {
  history,
  cancelInteraction,
  platformUser,
  recoverRequest,
  respondToInteraction,
  sendMessage,
} from "../lib/server/agent-studio";
import {
  interactionResponseSchema,
  interactionSubmissionSchema,
  interactionCancellationSchema,
  type ChatInteraction,
} from "../lib/interactions";

test("interaction submissions accept only one answer or a scoped decision", () => {
  const base = { interactionId: randomUUID(), revision: 1 };
  assert.ok(
    interactionResponseSchema.safeParse({
      ...base,
      kind: "question",
      text: "2500 元",
    }).success,
  );
  assert.ok(interactionResponseSchema.safeParse({ ...base, kind: "question", skip: true }).success);
  assert.ok(
    interactionResponseSchema.safeParse({
      ...base,
      kind: "approval",
      decision: "approve",
    }).success,
  );
  for (const value of [
    { ...base, kind: "question", skip: true, optionId: "one" },
    { ...base, kind: "question", skip: true, text: "answer" },
    { ...base, kind: "question", skip: false },
    { ...base, kind: "question", optionId: "one", text: "two" },
    { ...base, kind: "question" },
    {
      ...base,
      kind: "approval",
      decision: "approve",
      arguments: { amount: 1 },
    },
    { ...base, kind: "approval", decision: "approve", approvedTools: ["all"] },
    { ...base, kind: "approval", decision: "approve", userId: "someone-else" },
  ])
    assert.equal(interactionResponseSchema.safeParse(value).success, false);
  assert.equal(
    interactionSubmissionSchema.safeParse({
      threadId: randomUUID(),
      response: { ...base, kind: "approval", decision: "reject" },
      userId: "forged",
    }).success,
    false,
  );
  assert.equal(
    interactionCancellationSchema.safeParse({
      threadId: randomUUID(),
      userId: "forged",
    }).success,
    false,
  );
});

test("waiting deliveries restore cards without replay, then resume the same request through question and approval", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "agent-studio-showcase-interactions-"));
  process.env.HUB_DATA_DIR = directory;
  process.env.AGENT_STUDIO_API_KEY = "test-key";
  const conversationId = randomUUID(),
    integrationCallId = randomUUID(),
    runId = randomUUID();
  const question: ChatInteraction = {
    id: randomUUID(),
    runId: integrationCallId,
    kind: "question",
    status: "pending",
    revision: 1,
    expiresAt: "2099-01-01T00:00:00Z",
    question: "你的预算是多少？",
    options: [{ id: "mid", label: "2000–3000 元" }],
    allowCustom: true,
  };
  const approval: ChatInteraction = {
    id: randomUUID(),
    runId: integrationCallId,
    kind: "approval",
    status: "pending",
    revision: 1,
    expiresAt: "2099-01-01T00:00:00Z",
    toolName: "submit_request",
    arguments: { amount: 2499 },
  };
  const calls: { path: string; body?: Record<string, unknown> }[] = [];
  let clientRequestId = "",
    userId = "",
    prompt = "",
    status = "waiting",
    phase = 0,
    hideRuns = false;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url!, "http://localhost");
    if (request.method === "GET") {
      assert.equal(url.searchParams.get("userId"), userId);
      response.writeHead(200, { "content-type": "application/json" });
      if (url.pathname.endsWith("/runs"))
        response.end(
          JSON.stringify(
            hideRuns
              ? []
              : [
                  {
                    id: runId,
                    integrationCallId,
                    clientRequestId,
                    question: prompt,
                    status,
                    assistantMessageId: phase === 2 ? 42 : null,
                    interactions:
                      phase === 0 ? [question] : [question, approval],
                  },
                ],
          ),
        );
      else
        response.end(
          JSON.stringify(
            phase === 2
              ? [
                  { id: 41, role: "user", content: prompt },
                  {
                    id: 42,
                    role: "assistant",
                    content: "申请已处理",
                    interactions: [question, approval],
                  },
                ]
              : [],
          ),
        );
      return;
    }
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : undefined;
    calls.push({ path: request.url!, body });
    if (url.pathname.endsWith("/cancel")) {
      assert.equal(
        raw,
        "",
        "cancellation must not forward a browser body or identity",
      );
      assert.equal(url.searchParams.get("userId"), userId);
      question.status = "cancelled";
      status = "cancelled";
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ cancelled: true }));
      return;
    }
    if (
      url.pathname.endsWith("/respond") &&
      body.kind === "question" &&
      question.status === "answered"
    ) {
      if (
        body.revision !== question.revision - 1 ||
        body.optionId !== "mid" ||
        body.text
      ) {
        response.writeHead(409, { "content-type": "application/json" });
        response.end(JSON.stringify({ message: "此交互已处理" }));
        return;
      }
      response.writeHead(202, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          runId: integrationCallId,
          conversationId,
          replayed: true,
          interaction: question,
        }),
      );
      return;
    }
    response.writeHead(200, { "content-type": "text/event-stream" });
    if (url.pathname.endsWith("/messages")) {
      clientRequestId = String(request.headers["idempotency-key"]);
      userId = body.userId;
      prompt = body.message;
      response.write(
        `event: run_started\ndata: ${JSON.stringify({ conversationId, runId: integrationCallId })}\n\n`,
      );
      response.end(
        `event: interaction_required\ndata: ${JSON.stringify({ runId: integrationCallId, interaction: question })}\n\n`,
      );
    } else {
      assert.equal(url.searchParams.get("userId"), userId);
      if (phase === 0) {
        assert.deepEqual(body, {
          kind: "question",
          interactionId: question.id,
          revision: 1,
          optionId: "mid",
        });
        question.status = "answered";
        question.revision++;
        question.answer = { optionId: "mid" };
        phase = 1;
        response.end(
          `event: interaction_required\ndata: ${JSON.stringify({ runId: integrationCallId, interaction: approval })}\n\n`,
        );
      } else {
        assert.deepEqual(body, {
          kind: "approval",
          interactionId: approval.id,
          revision: 1,
          decision: "approve",
        });
        approval.status = "approved";
        approval.revision++;
        phase = 2;
        status = "completed";
        response.end(
          `event: done\ndata: ${JSON.stringify({ conversationId, answer: "申请已处理" })}\n\n`,
        );
      }
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  process.env.AGENT_STUDIO_BASE_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  t.after(async () => {
    db().close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  });
  const local = createThread(
    "visitor-one",
    "robot-assistant",
    "1001",
    "2025-12",
  );
  const deliveryId = randomUUID();
  const initial = await (
    await sendMessage(local, "帮我选择", deliveryId)
  ).text();
  assert.match(initial, /interaction_required/);
  assert.doesNotMatch(initial, /event: error|event: done/);
  assert.equal(pending(local.id)?.state, "waiting");
  const owned = thread("visitor-one", local.id);
  assert.equal(platformUser(owned), userId);
  assert.throws(() => thread("visitor-two", local.id, "robot-assistant"));
  assert.throws(() => thread("visitor-one", local.id, "contoso-outdoor"));
  const restored = await history(owned);
  assert.equal(restored.pending?.state, "waiting");
  assert.equal(restored.messages.length, 2);
  assert.equal(restored.messages[1].interactions[0].id, question.id);
  await assert.rejects(recoverRequest(owned), /无需恢复原请求/);
  await assert.rejects(
    sendMessage(owned, "普通消息不能代替审批", randomUUID()),
    /上一条消息尚未确认/,
  );
  assert.equal(
    calls.filter((call) => call.path.endsWith("/messages")).length,
    1,
  );
  await assert.rejects(
    respondToInteraction(owned, {
      kind: "question",
      interactionId: randomUUID(),
      revision: 1,
      text: "forged",
    }),
    /交互请求不存在/,
  );
  await assert.rejects(
    respondToInteraction(owned, {
      kind: "question",
      interactionId: question.id,
      revision: 2,
      text: "stale",
    }),
    /交互请求已变化/,
  );
  const second = await (
    await respondToInteraction(owned, {
      kind: "question",
      interactionId: question.id,
      revision: 1,
      optionId: "mid",
    })
  ).text();
  assert.match(second, /interaction_required/);
  assert.doesNotMatch(second, /event: error|event: done/);
  assert.equal(pending(local.id)?.state, "waiting");
  const replay = await respondToInteraction(owned, {
    kind: "question",
    interactionId: question.id,
    revision: 1,
    optionId: "mid",
  });
  assert.equal(replay.status, 202);
  assert.equal((await replay.json()).replayed, true);
  assert.equal(
    pending(local.id)?.state,
    "waiting",
    "JSON replay is an acknowledgement and must not mark the task completed or failed",
  );
  await assert.rejects(
    respondToInteraction(owned, {
      kind: "question",
      interactionId: question.id,
      revision: 1,
      text: "a different answer",
    }),
    /此交互已处理/,
  );
  await assert.rejects(
    respondToInteraction(owned, {
      kind: "question",
      interactionId: question.id,
      revision: 99,
      optionId: "mid",
    }),
    /此交互已处理/,
  );
  const withApproval = await history(owned);
  assert.deepEqual(
    withApproval.messages[1].interactions.map(
      (item: ChatInteraction) => item.status,
    ),
    ["answered", "pending"],
  );
  const final = await (
    await respondToInteraction(owned, {
      kind: "approval",
      interactionId: approval.id,
      revision: 1,
      decision: "approve",
    })
  ).text();
  assert.match(final, /event: done/);
  assert.equal(pending(local.id), undefined);
  const completed = await history(owned);
  assert.equal(
    completed.messages.length,
    2,
    "saved history must replace synthetic waiting messages without duplication",
  );
  assert.deepEqual(
    completed.messages[1].interactions.map(
      (item: ChatInteraction) => item.status,
    ),
    ["answered", "approved"],
  );
  assert.equal(
    calls.filter((call) => call.path.endsWith("/messages")).length,
    1,
  );
  hideRuns = true;
  assert.equal(
    (await history(owned)).messages[1].interactions.length,
    2,
    "old cards returned directly by message history survive the limited runs window",
  );
  hideRuns = false;
  phase = 0;
  status = "waiting";
  question.id = randomUUID();
  question.status = "pending";
  question.revision = 1;
  delete question.answer;
  await (await sendMessage(owned, "取消等待的提问", randomUUID())).text();
  await assert.rejects(
    cancelInteraction(owned, randomUUID()),
    /交互请求不存在/,
  );
  assert.deepEqual(await cancelInteraction(owned, question.id), {
    cancelled: true,
  });
  assert.equal(pending(local.id), undefined);
  const cancelled = await history(owned);
  assert.equal(cancelled.messages.at(-1).interactions[0].status, "cancelled");
});
