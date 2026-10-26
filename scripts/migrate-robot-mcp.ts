// Explicit operator action. Uses existing administrative APIs only; never loads
// another project's environment, changes application channels, or runs on start.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { robotMcpToolDefinitions } from "../lib/robot/tools";

type Api = (path: string, method?: string, body?: unknown) => Promise<any>;
export const robotSamples: Record<string, Record<string, unknown>> = {
  list_demo_users: {}, get_user_id: { user_id: "1001" },
  get_user_location: { user_id: "1001" }, get_current_month: {},
  fetch_external_data: { user_id: "1001", month: "2025-12" }, fill_context_for_report: {},
};
export function mcpToolConfig(definition: any, versionId: number, previous: any) {
  return {
    type: "mcp", target: definition.name, mcpVersionId: versionId,
    description: definition.description ?? previous.description,
    parameters: definition.inputSchema,
    ...(definition.outputSchema ? { outputSchema: definition.outputSchema } : {}),
    timeoutMs: previous.timeoutMs, maxRetries: 0,
    readOnly: previous.readOnly, requiresApproval: previous.requiresApproval,
  };
}
export async function migrateRobotMcp(api: Api, agentId: number, apply = false) {
  const names = Object.keys(robotMcpToolDefinitions).sort();
  let agent = await api(`/agent-resources/${agentId}`);
  const current = agent.versions.find((version: any) => version.id === agent.currentVersionId);
  let draft = agent.versions.find((version: any) => version.status === "draft");
  if (!current) throw new Error("Robot Agent must have a current published version");
  if (draft && (!isDeepStrictEqual(draft.config, current.config) || draft.name !== current.name))
    throw new Error("Robot Agent has unrelated draft changes; finish them before migration");
  const { resources } = await api("/agent-resources");
  const { servers } = await api("/external-tools/mcp");
  const server = servers.find((value: any) => value.key === "demo_hub_robot");
  if (!server?.enabled) throw new Error("Existing robot MCP server must be enabled");
  const tools = names.map(name => resources.find((value: any) => value.kind === "tool" && value.key === name));
  if (tools.some(value => !value)) throw new Error("Expected robot business Tool resource is missing");
  const weather = resources.find((value: any) => value.kind === "tool" && value.key === "get_weather");
  if (!weather || weather.toolType !== "rest") throw new Error("Weather must remain an independent HTTP Tool");
  const selectedIds = new Set<number>(current.config.toolVersionIds);
  for (const tool of [...tools, weather]) {
    if (!tool.versions.some((version: any) => selectedIds.has(version.id)))
      throw new Error(`Robot Agent is not bound to expected Tool ${tool.key}`);
  }
  const plan = { agentId, mcpServerId: server.id, businessTools: names, weather: "get_weather: rest", preserveOtherBindings: true };
  if (!apply) return plan;
  let connection = await api(`/external-tools/mcp/${server.id}`);
  let latest = connection.versions[0];
  if (!isDeepStrictEqual((latest.catalog ?? []).map((tool: any) => tool.name).sort(), names)) {
    const discovered = await api(`/external-tools/mcp/${server.id}/discover`, "POST", { versionId: latest.id });
    if (!discovered.ok || discovered.toolCount !== names.length) throw new Error("Robot MCP must expose exactly six business tools without weather");
    connection = await api(`/external-tools/mcp/${server.id}`);
    latest = connection.versions.find((version: any) => version.id === discovered.id);
  }
  if (!latest || !isDeepStrictEqual(latest.catalog.map((tool: any) => tool.name).sort(), names))
    throw new Error("Unexpected robot MCP catalog");
  const replacements = new Map<number, number>();
  for (const resource of tools) {
    let detail = await api(`/agent-resources/${resource.id}`);
    const active = detail.versions.find((version: any) => selectedIds.has(version.id));
    const definition = latest.catalog.find((tool: any) => tool.name === resource.key);
    const desired = mcpToolConfig(definition, latest.id, active.config);
    // Existing keys are deliberately retained: Prompt/Skill tool names remain valid.
    let chosen = detail.versions.find((version: any) => version.status === "published" && version.config.type === "mcp" && version.config.mcpVersionId === latest.id);
    if (!chosen) {
      let working = detail.versions.find((version: any) => version.status === "draft");
      if (working && !isDeepStrictEqual(working.config, active.config) && !(working.config.type === "mcp" && working.config.mcpVersionId === latest.id))
        throw new Error(`Unrelated Tool draft exists: ${resource.key}`);
      if (!working) {
        const created = await api(`/agent-resources/tools/${resource.id}/draft`, "POST", { fromVersionId: active.id });
        detail = await api(`/agent-resources/${resource.id}`);
        working = detail.versions.find((version: any) => version.id === created.versionId);
      }
      await api(`/agent-resources/versions/${working.id}`, "PATCH", { revision: working.revision, config: desired });
      const tested = await api(`/agent-resources/versions/${working.id}/test`, "POST", { input: robotSamples[resource.key], execute: true });
      if (!tested.ok) throw new Error(`MCP Tool execution failed: ${resource.key}`);
      await api(`/agent-resources/versions/${working.id}/publish`, "POST", {});
      chosen = working;
    }
    replacements.set(active.id, chosen.id);
  }
  const toolVersionIds = current.config.toolVersionIds.map((id: number) => replacements.get(id) ?? id);
  if (!isDeepStrictEqual(toolVersionIds, current.config.toolVersionIds)) {
    if (!draft) {
      const created = await api(`/agent-resources/agents/${agentId}/draft`, "POST", { fromVersionId: current.id });
      agent = await api(`/agent-resources/${agentId}`);
      draft = agent.versions.find((version: any) => version.id === created.versionId);
    }
    await api(`/agent-resources/versions/${draft.id}`, "PATCH", { revision: draft.revision, config: { ...draft.config, toolVersionIds } });
    const tested = await api(`/agent-resources/versions/${draft.id}/test`, "POST", {});
    if (!tested.ok) throw new Error("Robot Agent configuration validation failed");
    await api(`/agent-resources/versions/${draft.id}/publish`, "POST", {});
  }
  const after = await api(`/agent-resources/${agentId}`);
  return { ...plan, currentVersionId: after.currentVersionId, toolVersionIds };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const session = process.env.AGENT_STUDIO_ADMIN_SESSION_FILE
    ? JSON.parse(readFileSync(process.env.AGENT_STUDIO_ADMIN_SESSION_FILE, "utf8")) : {};
  const token = process.env.AGENT_STUDIO_ADMIN_TOKEN ?? session.accessToken;
  const base = process.env.AGENT_STUDIO_ADMIN_URL ?? session.base;
  const workspace = process.env.AGENT_STUDIO_WORKSPACE_ID;
  const agentId = Number(process.env.AGENT_STUDIO_AGENT_ID);
  if (!token || !base || !workspace || !Number.isSafeInteger(agentId) || agentId < 1)
    throw new Error("Explicit admin URL/session, token, workspace and robot Agent ID are required");
  const api: Api = async (path, method = "GET", body) => {
    const response = await fetch(base + path, { method, headers: { authorization: `Bearer ${token}`, "X-Workspace-Id": workspace, "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = await response.json();
    if (!response.ok) throw new Error(`${method} ${path}: ${response.status}: ${result.message ?? "request failed"}`);
    return result;
  };
  console.log(JSON.stringify(await migrateRobotMcp(api, agentId, process.argv.includes("--apply")), null, 2));
}
