// Explicit local operator action. No admin credentials are saved by this script.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { mcpToolConfig } from "./migrate-robot-mcp";
import { toolDefinitions, robotMcpToolDefinitions, type ToolName } from "../lib/robot/tools";

process.loadEnvFile(".env.local");
const password = process.env.DEMO_ADMIN_PASSWORD;
if (!password)
  throw new Error(
    "Set DEMO_ADMIN_PASSWORD in this process to configure the local Agent.",
  );
const base = process.env.AGENT_STUDIO_BASE_URL!;
const agentId = Number(process.env.AGENT_STUDIO_AGENT_ID ?? 5);
const workspace = process.env.DEMO_WORKSPACE_ID ?? "4";
const login = await fetch(base + "/admin/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    email: process.env.DEMO_ADMIN_LOGIN ?? "chaobin",
    password,
  }),
});
if (!login.ok) throw new Error(`Admin login failed: ${login.status}`);
const { accessToken } = await login.json();
async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(base + "/admin" + path, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "X-Workspace-Id": workspace,
      "content-type": "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(`${method} ${path}: ${JSON.stringify(result)}`);
  return result;
}
const directory = ".data/agent-connection";
mkdirSync(directory, { recursive: true, mode: 0o700 });
const before = await api(`/agent-resources/${agentId}`);
const apps = await api("/integrations");
const app = apps.find(
  (item: { agentId: number; apiEnabled: boolean; enabled: boolean }) =>
    item.agentId === agentId && item.apiEnabled && item.enabled,
);
if (!app)
  throw new Error(
    "A pre-enabled platform API integration must exist; this script does not enable applications or change Origins.",
  );
if (!existsSync(`${directory}/before.json`))
  writeFileSync(
    `${directory}/before.json`,
    JSON.stringify({ agent: before, app }, null, 2),
    { mode: 0o600 },
  );
let state: Record<string, any> = existsSync(`${directory}/result.json`)
  ? JSON.parse(readFileSync(`${directory}/result.json`, "utf8"))
  : {};
function save() {
  writeFileSync(`${directory}/result.json`, JSON.stringify(state, null, 2), {
    mode: 0o600,
  });
}
if (!process.env.AGENT_STUDIO_API_KEY) {
  const key = await api(`/integrations/${app.id}/keys`, "POST", {
    name: "Demo Hub local server",
    scopes: ["chat:write", "conversations:read", "conversations:delete"],
  });
  const env = readFileSync(".env.local", "utf8").replace(
    /^AGENT_STUDIO_API_KEY=.*$/m,
    `AGENT_STUDIO_API_KEY=${key.apiKey}`,
  );
  writeFileSync(".env.local", env, { mode: 0o600 });
  state.keyId = key.id;
  save();
  console.log(
    "Created server-side integration credential; saved only to .env.local.",
  );
}
if (!state.credentialId) {
  state.credentialId = (
    await api("/external-tools/credentials", "POST", {
      name: "Demo Hub robot tools",
      kind: "bearer",
      secret: process.env.TOOL_API_TOKEN,
    })
  ).id;
  save();
}
const existing = await api("/agent-resources");
state.tools ??= {};
const testInputs: Record<ToolName, unknown> = {
  list_demo_users: {},
  get_user_id: { user_id: "1001" },
  get_user_location: { user_id: "1001" },
  get_current_month: {},
  get_weather: { city: "杭州" },
  fetch_external_data: { user_id: "1001", month: "2025-12" },
  fill_context_for_report: {},
};
for (const name of ["get_weather"] as ToolName[]) {
  const definition = toolDefinitions[name];
  const resource = existing.resources.find(
    (item: { key: string; kind: string }) =>
      item.key === name && item.kind === "tool",
  );
  let ids = state.tools[name];
  if (!ids && resource)
    ids = { resourceId: resource.id, versionId: resource.versions[0].id };
  if (!ids)
    ids = await api("/agent-resources", "POST", {
      kind: "tool",
      key: name,
      name: `Robot Lab · ${name}`,
      config: {
        description: definition.description,
        type: "rest",
        parameters: z.toJSONSchema(definition.schema),
        endpoint: {
          connection: "external",
          url: `${process.env.SITE_ORIGIN}/api/tools/${name}`,
          method: "GET",
          credentialId: state.credentialId,
        },
        timeoutMs: 15000,
        maxRetries: 0,
        readOnly: true,
        requiresApproval: false,
      },
    });
  state.tools[name] = ids;
  save();
  const detail = await api(`/agent-resources/${ids.resourceId}`);
  const version = detail.versions.find(
    (item: { id: number }) => item.id === ids.versionId,
  );
  if (version.status !== "published") {
    const tested = await api(
      `/agent-resources/versions/${ids.versionId}/test`,
      "POST",
      { input: testInputs[name], execute: true },
    );
    if (!tested.ok)
      throw new Error(
        `Real tool test failed: ${name}: ${JSON.stringify(tested)}`,
      );
    await api(`/agent-resources/versions/${ids.versionId}/publish`, "POST", {});
  }
  console.log(`HTTP tool verified: ${name}`);
}
if (!state.mcpServerId) {
  state.mcpServerId = (
    await api("/external-tools/mcp", "POST", {
      key: "demo_hub_robot",
      name: "Demo Hub Robot Tools",
      config: {
        url: `${process.env.SITE_ORIGIN}/api/mcp`,
        credentialId: state.credentialId,
        timeoutMs: 15000,
      },
    })
  ).id;
  save();
}
{
  const detail = await api(`/external-tools/mcp/${state.mcpServerId}`);
  const version = detail.versions[0];
  if (version.catalog?.length === 6 && !version.catalog.some((tool: any) => tool.name === "get_weather")) {
    state.mcpVersionId = version.id;
    save();
  } else {
    const discovery = await api(
      `/external-tools/mcp/${state.mcpServerId}/discover`,
      "POST",
      { versionId: version.id },
    );
    if (!discovery.ok || discovery.toolCount !== 6)
      throw new Error(`MCP discovery failed: ${JSON.stringify(discovery)}`);
    state.mcpVersionId = discovery.id;
    save();
    console.log("MCP discovered: 6 business tools.");
  }
}
const mcpToolIds: number[] = [];
const mcpDetail = await api(`/external-tools/mcp/${state.mcpServerId}`);
const catalog = mcpDetail.versions.find((version: any) => version.id === state.mcpVersionId).catalog;
for (const name of Object.keys(robotMcpToolDefinitions)) {
  const definition = catalog.find((tool: any) => tool.name === name);
  const resource = existing.resources.find((item: any) => item.kind === "tool" && item.key === name);
  const desired = mcpToolConfig(definition, state.mcpVersionId, { timeoutMs: 15000, readOnly: true, requiresApproval: false });
  let ids: any;
  if (!resource) ids = await api("/agent-resources", "POST", { kind: "tool", key: name, name: `Robot Lab · ${name}`, config: desired });
  else {
    const detail = await api(`/agent-resources/${resource.id}`);
    const ready = detail.versions.find((version: any) => version.status === "published" && version.config.type === "mcp" && version.config.mcpVersionId === state.mcpVersionId);
    if (ready) { mcpToolIds.push(ready.id); continue; }
    ids = await api(`/agent-resources/tools/${resource.id}/draft`, "POST", {});
  }
  const detail = await api(`/agent-resources/${ids.resourceId}`);
  const version = detail.versions.find((item: any) => item.id === ids.versionId);
  await api(`/agent-resources/versions/${version.id}`, "PATCH", { revision: version.revision, config: desired });
  const tested = await api(`/agent-resources/versions/${version.id}/test`, "POST", { input: testInputs[name as ToolName], execute: true });
  if (!tested.ok) throw new Error(`MCP tool test failed: ${name}`);
  await api(`/agent-resources/versions/${version.id}/publish`, "POST", {});
  mcpToolIds.push(version.id);
}
const template = readFileSync("docs/robot-agent-prompt.txt", "utf8");
if (!state.promptVersionId) {
  const prompts = await api("/prompts");
  let resource = prompts.find(
    (item: { promptKey: string }) => item.promptKey === "demo_hub.robot",
  );
  if (!resource)
    resource = await api("/prompts", "POST", {
      promptKey: "demo_hub.robot",
      name: "Robot Lab · 咨询与模拟报告",
      promptType: "system",
      description: "Demo Hub 公开示例数据与扫地机器人知识问答",
      template,
    });
  const detail = await api(`/prompts/${resource.id}`);
  const version = detail.versions[0];
  if (version.status !== "published") {
    const input = {
      template,
      variables: {},
      expectedRevision: version.revision,
    };
    const review = await api(
      `/prompts/versions/${version.versionId}/review`,
      "POST",
      input,
    );
    if (!review.agentSelectable)
      throw new Error("Prompt is not Agent-selectable");
    await api(`/prompts/versions/${version.versionId}/publish`, "POST", {
      ...input,
      reviewHash: review.reviewHash,
      changeNote:
        "接入 Demo Hub 模拟用户、记录与天气工具；保留知识库和故障排查边界。",
    });
  }
  state.promptVersionId = version.versionId;
  save();
}
if (!state.agentVersionId) {
  const draft = await api(
    `/agent-resources/agents/${agentId}/draft`,
    "POST",
    {},
  );
  const detail = await api(`/agent-resources/${agentId}`);
  const version = detail.versions.find(
    (item: { id: number }) => item.id === draft.versionId,
  );
  const config = {
    ...version.config,
    promptVersionId: state.promptVersionId,
    toolVersionIds: [state.tools.get_weather.versionId, ...mcpToolIds],
    responsibility: "扫地机器人知识咨询、模拟家庭使用报告与天气环境建议",
    runtime: { ...version.config.runtime, maxToolCalls: 12 },
    welcome: {
      title: "你好，今天有什么想聊的？",
      description: "咨询扫拖知识，或探索一个模拟家庭的清洁记录。",
      suggestedQuestions: [
        "无法正常回充应该怎么排查？",
        "根据我的示例月份生成一份清洁报告。",
        "根据我的城市查询模拟天气并给出拖地建议。",
      ],
    },
  };
  await api(`/agent-resources/versions/${version.id}`, "PATCH", {
    revision: version.revision,
    config,
  });
  const tested = await api(
    `/agent-resources/versions/${version.id}/test`,
    "POST",
    {},
  );
  if (!tested.ok) throw new Error("Agent configuration validation failed");
  await api(`/agent-resources/versions/${version.id}/publish`, "POST", {});
  state.agentVersionId = version.id;
  state.previousVersionId = before.currentVersionId;
  state.appId = app.id;
  save();
  console.log(
    `Agent ${agentId} now uses verified version ${version.id}; previous version ${state.previousVersionId} retained.`,
  );
}
console.log(
  "Local integration configured. Application enablement and allowed Origins preserved.",
);
