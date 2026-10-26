import type { AgentCapabilityCounts, DisplaySnapshot, PreviewConversation, PreviewTurn, QuotaPolicy, SharedQuota } from "./types";
import { quotaPolicy } from "./quota";
export type Scenario = "normal" | "near" | "daily" | "tokens" | "minute" | "reserved" | "disabled";
export const scenarios: { id: Scenario; label: string }[] = [
  { id: "normal", label: "正常使用" }, { id: "near", label: "接近上限" },
  { id: "daily", label: "每日请求耗尽" }, { id: "tokens", label: "每日 Token 耗尽" },
  { id: "minute", label: "分钟限流" }, { id: "reserved", label: "Token 暂被预留" }, { id: "disabled", label: "限制未启用" },
];
export const mockClock = "2026-10-26T09:30:26+08:00";
export function mockCapabilityCounts(agentName: string): AgentCapabilityCounts {
  return { agentName, knowledgeBases: 2, skills: 2, tools: 2, mcpServices: 1 };
}
/** Developer fixture selection only. This never authorizes a real snapshot API. */
export function mockInfoOptions(environment: string | undefined, params: Record<string, string | string[] | undefined>) {
  const development = environment === "development";
  const scenario = scenarios.find(item => item.id === params.mockQuota)?.id ?? "normal";
  return { mockInfo: development, mockAdministrator: development && params.mockAdmin === "1", mockScenario: development ? scenario : "normal" as Scenario };
}
export function mockQuota(scenario: Scenario): SharedQuota {
  const result: SharedQuota = { scope: "application-shared", timezone: "Asia/Shanghai", checkedAt: mockClock, resetAt: "2026-10-27T00:00:00+08:00" };
  if (scenario === "disabled") return result;
  const requests = scenario === "daily" ? 100 : scenario === "near" ? 94 : 64;
  const tokens = scenario === "tokens" ? 120000 : scenario === "near" ? 110400 : scenario === "reserved" ? 90000 : 78000;
  const reserved = scenario === "reserved" ? 30000 : 0;
  const minute = scenario === "minute" ? 10 : scenario === "near" ? 8 : 2;
  return { ...result, requests: { limit: 100, used: requests, remaining: 100 - requests }, tokens: { limit: 120000, used: tokens, reserved, remaining: Math.max(0, 120000 - tokens - reserved), unsettled: reserved > 0 }, minute: { limit: 10, used: minute, remaining: 10 - minute, windowSeconds: 60, retryAt: "2026-10-26T09:31:00+08:00" } };
}
export function mockSnapshot(turn: number, policy: QuotaPolicy, preview = false): DisplaySnapshot {
  const revision = preview ? 5 : turn === 1 ? 3 : 4;
  return {
    kind: preview ? "current-preview" : "recorded-turn", capturedAt: mockClock,
    ...(!preview ? { runId: `mock-run-${turn.toString().padStart(2, "0")}` } : {}),
    agent: { name: "扫地机器人助手", version: `v${revision}` },
    modelPlan: { name: "通用对话方案", version: revision === 3 ? "v2" : "v3" },
    prompt: { name: "清洁咨询与模拟报告", version: revision === 3 ? "v12" : "v13" },
    tools: [{ name: "模拟天气查询", version: "v1" }, { name: "生成式 UI", version: "v2" }],
    skills: [{ name: "故障排查", version: "v3" }, { name: "清洁报告指导", version: "v2" }],
    mcp: [{ name: "机器人业务服务", version: "v2", toolCount: 6 }],
    knowledge: [{ name: "扫拖机器人使用指南", version: "索引 v4" }, { name: "清洁与耗材维护", version: "索引 v2" }],
    retrieval: { mode: "混合检索", topK: 5, contextChars: 12000, similarity: 0.65 },
    collaboration: revision === 3 ? { mode: "single", members: [] } : { mode: "multi", members: [{ name: "清洁分析 Agent", version: "v2" }] },
    output: "自然语言 · 可调用生成式 UI",
    budgets: { modelCalls: revision === 3 ? 32 : 40, toolCalls: 40, tokens: 120000 },
    application: { name: "Robot Lab 展示站", policy: { ...policy } },
  };
}
export function makePreviewTurn(number: number, question: string, quota: SharedQuota): PreviewTurn {
  const snapshot = mockSnapshot(number, quotaPolicy(quota));
  return { id: `mock-turn-${number}`, number, question, startedAt: mockClock, state: "recording", answer: number === 1 ? "杭州的模拟天气是阴天，约 20℃，相对湿度 72%。\n\n今天可以正常拖地，建议减少出水量，并在清洁结束后保持室内通风。湿度偏高时，记得及时清洗并晾干拖布。\n\n以上为固定天气样本，不是实时观测。" : "我已结合这份模拟家庭的清洁记录整理了建议。\n\n建议先检查拖布与滤网，再根据地面材质调整出水量。对比报告只使用选定月份的示例记录，不代表真实设备状态。", snapshot };
}
export function historicalConversations(): PreviewConversation[] {
  const first = makePreviewTurn(1, "今天适合拖地吗？", mockQuota("normal"));
  const second = makePreviewTurn(2, "再看看我的清洁记录。", mockQuota("near"));
  second.snapshot = mockSnapshot(2, { dailyRequests: 150, dailyTokens: 180000, requestsPerMinute: 15 });
  return [
    { id: "mock-history-weather", title: "杭州家庭的清洁建议", date: "10月26日", turns: [{ ...first, state: "completed" }, { ...second, state: "completed" }] },
    { id: "mock-history-report", title: "十二月清洁记录分析", date: "10月25日", turns: [{ ...first, id: "mock-report-turn-1", question: "帮我看看十二月的清洁效率。", state: "completed" }] },
  ];
}
