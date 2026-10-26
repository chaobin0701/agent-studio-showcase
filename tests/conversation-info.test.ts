import test from "node:test";
import assert from "node:assert/strict";
import { historicalConversations, makePreviewTurn, mockInfoOptions, mockQuota, mockSnapshot } from "../lib/conversation-info/mock";
import { formatReset, quotaNotice, quotaPolicy } from "../lib/conversation-info/quota";

test("shared quota notices distinguish ordinary use, approaching and exhausted budgets", () => {
  assert.equal(quotaNotice(mockQuota("normal")).level, "neutral");
  assert.equal(quotaNotice(mockQuota("near")).level, "warning");
  assert.equal(quotaNotice(mockQuota("near")).blocked, false);
  assert.equal(quotaNotice(mockQuota("daily")).reason, "daily-requests");
  assert.equal(quotaNotice(mockQuota("tokens")).reason, "daily-tokens");
  assert.equal(quotaNotice(mockQuota("daily")).blocked, true);
});
test("rolling minute limits and temporary Token reservations do not become daily exhaustion", () => {
  const minute = quotaNotice(mockQuota("minute"));
  assert.equal(minute.reason, "minute");
  assert.match(minute.detail, /09:31/);
  const reserved = quotaNotice(mockQuota("reserved"));
  assert.equal(reserved.reason, "reserved");
  assert.equal(reserved.level, "warning");
  assert.equal(reserved.blocked, true);
  assert.equal(mockQuota("reserved").tokens!.used, 90000);
  assert.equal(mockQuota("reserved").tokens!.remaining, 0);
});
test("disabled limits are omitted, and a minute-only quota still has independent enforcement", () => {
  const disabled = mockQuota("disabled");
  assert.deepEqual(quotaPolicy(disabled), {});
  assert.equal(Object.hasOwn(disabled, "requests"), false);
  assert.equal(Object.hasOwn(disabled, "tokens"), false);
  assert.equal(Object.hasOwn(disabled, "minute"), false);
  assert.equal(quotaNotice(disabled).blocked, false);
  const minuteOnly = { ...mockQuota("minute"), requests: undefined, tokens: undefined };
  assert.equal(quotaNotice(minuteOnly).reason, "minute");
  assert.deepEqual(quotaPolicy(minuteOnly), { requestsPerMinute: 10 });
});
test("a turn captures its application policy at start and does not follow later quota or Agent changes", () => {
  const initialQuota = mockQuota("normal");
  const first = makePreviewTurn(1, "天气如何？", initialQuota);
  initialQuota.requests!.limit = 150;
  const next = makePreviewTurn(2, "看看清洁记录", initialQuota);
  assert.equal(first.snapshot!.agent.version, "v3");
  assert.equal(next.snapshot!.agent.version, "v4");
  assert.equal(first.snapshot!.application.policy.dailyRequests, 100);
  assert.equal(next.snapshot!.application.policy.dailyRequests, 150);
  assert.equal(first.state, "recording");
  assert.equal(first.snapshot!.kind, "recorded-turn");
  const current = mockSnapshot(0, quotaPolicy(initialQuota), true);
  assert.equal(current.kind, "current-preview");
  assert.equal(current.agent.version, "v5");
  assert.equal(current.runId, undefined);
  const history = historicalConversations()[0];
  assert.deepEqual(history.turns.map(turn => turn.snapshot!.application.policy.dailyRequests), [100, 150]);
});
test("display snapshots contain resource summaries and budgets, never implementation or credential fields", () => {
  const snapshot = mockSnapshot(1, quotaPolicy(mockQuota("normal")));
  const keys: string[] = [];
  function collect(value: unknown) {
    if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) { keys.push(key); collect(child); }
  }
  collect(snapshot);
  for (const forbidden of ["secret", "apiKey", "credentialId", "endpoint", "url", "template", "instructions", "arguments", "requestBody"]) assert.ok(!keys.includes(forbidden), forbidden);
  assert.equal(snapshot.mcp[0].toolCount, 6);
  assert.equal(snapshot.tools.length, 2);
  assert.equal(snapshot.budgets.modelCalls, 32);
  assert.match(formatReset("2026-10-26T16:00:00Z"), /00:00/);
});
test("mock settings only select local fixtures and cannot enable an administrator layout in production", () => {
  assert.deepEqual(mockInfoOptions("production", { mockAdmin: "1", mockQuota: "daily" }), { mockInfo: false, mockAdministrator: false, mockScenario: "normal" });
  assert.deepEqual(mockInfoOptions("development", { mockAdmin: "1", mockQuota: "minute" }), { mockInfo: true, mockAdministrator: true, mockScenario: "minute" });
  assert.equal(mockInfoOptions("development", { mockQuota: "unknown" }).mockScenario, "normal");
  assert.equal(mockInfoOptions("development", { mockAdmin: ["1"] }).mockAdministrator, false);
});
