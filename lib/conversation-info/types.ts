/** Display-only contract. No prompt bodies, credentials, endpoints or tool inputs. */
export type Meter = { limit: number; used: number; remaining: number };
export type SharedQuota = {
  scope: "application-shared";
  timezone: "Asia/Shanghai";
  checkedAt: string;
  resetAt: string;
  requests?: Meter;
  tokens?: Meter & { reserved: number; unsettled: boolean };
  minute?: Meter & { windowSeconds: 60; retryAt: string };
};
export type QuotaPolicy = {
  dailyRequests?: number;
  dailyTokens?: number;
  requestsPerMinute?: number;
};
export type ResourceSummary = { name: string; version: string };
export type AgentCapabilityCounts = {
  agentName: string;
  knowledgeBases: number;
  skills: number;
  tools: number;
  mcpServices: number;
};
export type DisplaySnapshot = {
  kind: "recorded-turn" | "current-preview";
  capturedAt: string;
  runId?: string;
  agent: ResourceSummary;
  modelPlan: ResourceSummary;
  prompt: ResourceSummary;
  tools: ResourceSummary[];
  skills: ResourceSummary[];
  mcp: (ResourceSummary & { toolCount: number })[];
  knowledge: ResourceSummary[];
  retrieval: { mode: string; topK: number; contextChars: number; similarity?: number };
  collaboration: { mode: "single" | "multi"; members: ResourceSummary[] };
  output: string;
  budgets: { modelCalls?: number; toolCalls?: number; tokens?: number };
  application: { name: string; policy: QuotaPolicy };
};
export type PreviewTurn = {
  id: string;
  number: number;
  question: string;
  answer: string;
  startedAt: string;
  state: "recording" | "completed";
  snapshot?: DisplaySnapshot;
};
export type PreviewConversation = { id: string; title: string; date: string; turns: PreviewTurn[] };

export type ConversationConfiguration = Pick<DisplaySnapshot, "capturedAt" | "agent" | "tools" | "skills" | "mcp" | "knowledge">;
export type ConfigurationTurn = { id: string; number: number; status: string; startedAt: string; snapshot: ConversationConfiguration | null };
