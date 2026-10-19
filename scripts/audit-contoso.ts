// Read-only operator audit of the resources created by connect-contoso.ts.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { platformAdmin } from "./platform-admin";
import { products } from "../lib/contoso/service";
import { contosoToolDefinitions } from "../lib/contoso/tools";
import { productManual } from "../lib/contoso/manuals";
import { contosoDatasetVersion } from "../lib/contoso/localization";
const api = await platformAdmin();
const state = JSON.parse(
  readFileSync(".data/contoso-connection/result.json", "utf8"),
);
assert.equal(state.knowledgeFormat, 3);
assert.equal(state.knowledgeDatasetVersion, contosoDatasetVersion);
assert.equal(state.knowledgeCorpusHash, createHash("sha256").update(products.map(productManual).join("\n\n")).digest("hex"));
const agent = await api(`/agent-resources/${state.agentId}`);
assert.equal(agent.currentVersionId, state.agentVersionId);
const version = agent.versions.find(
  (v: any) => v.id === agent.currentVersionId,
);
assert.equal(version.status, "published");
assert.deepEqual(version.config.knowledgeBaseIds, [state.knowledgeBaseId]);
assert.equal(version.config.promptVersionId, state.promptVersionId);
assert.equal(version.config.retrieval.topK, 8);
assert.deepEqual(
  version.config.toolVersionIds.sort((a: number, b: number) => a - b),
  Object.values(state.tools)
    .map((t: any) => t.versionId)
    .sort((a: number, b: number) => a - b),
);
const prompts = await api("/prompts");
const prompt = prompts.find((p: any) => p.promptKey === "demo_hub.contoso");
const promptDetail = await api(`/prompts/${prompt.id}`);
const promptVersion = promptDetail.versions.find(
  (v: any) => v.versionId === state.promptVersionId,
);
assert.equal(promptVersion.status, "published");
assert.equal(
  promptVersion.template,
  readFileSync("docs/contoso-agent-prompt.txt", "utf8"),
);
const base = await api(`/knowledge-bases/${state.knowledgeBaseId}`);
assert.equal(base.activeIndexVersionId, state.indexVersionId);
const docs = await api(
  `/knowledge-bases/${state.knowledgeBaseId}/documents?limit=100&state=active`,
);
assert.equal(docs.length, 20);
assert.ok(
  docs.every(
    (d: any) =>
      d.status === "ready" &&
      d.inCurrentIndex &&
      d.indexRevision === d.indexedRevision,
  ),
);
assert.deepEqual(
  docs.map((d: any) => d.originalFilename).sort(),
  products.map((p) => `${p.name}.md`).sort(),
);
const index = (
  await api(`/knowledge-bases/${state.knowledgeBaseId}/versions`)
).find((v: any) => v.id === state.indexVersionId);
assert.equal(index.status, "ready");
assert.ok(index.chunkCount > 20);
const first = docs.find(
  (d: any) => d.originalFilename === "远行者 X4 四人帐篷.md",
);
const blocks = await api(
  `/knowledge-bases/${state.knowledgeBaseId}/documents/${first.id}/blocks`,
);
assert.ok(
  blocks.blocks.some(
    (b: any) =>
      b.headingPath.includes("远行者 X4 四人帐篷") &&
      b.headingPath.includes("帐篷搭建"),
  ),
);
const apps = await api("/integrations");
const app = apps.find((a: any) => a.id === state.appId);
assert.equal(app.agentId, state.agentId);
assert.equal(app.enabled, true);
assert.equal(app.apiEnabled, true);
assert.equal(app.websiteEnabled, false);
assert.deepEqual(app.allowedOrigins, []);
const tools = [];
for (const [name, ids] of Object.entries(state.tools) as [string, any][]) {
  const resource = await api(`/agent-resources/${ids.resourceId}`);
  const tool = resource.versions.find((v: any) => v.id === ids.versionId);
  assert.equal(tool.status, "published");
  assert.equal(tool.config.readOnly, true);
  assert.equal(tool.config.description, contosoToolDefinitions[name as keyof typeof contosoToolDefinitions].description);
  assert.equal(tool.config.endpoint.credentialId, state.credentialId);
  assert.equal(
    tool.config.endpoint.url,
    `${process.env.SITE_ORIGIN}/api/contoso/tools/${name}`,
  );
  tools.push({ name, ...ids, type: tool.config.type, readOnly: true });
}
const mcp = await api(`/external-tools/mcp/${state.mcpServerId}`);
const mcpVersion = mcp.versions.find((v: any) => v.id === state.mcpVersionId);
assert.equal(state.mcpDatasetVersion, contosoDatasetVersion);
for (const tool of mcpVersion.catalog) {
  assert.equal(tool.description, contosoToolDefinitions[tool.name as keyof typeof contosoToolDefinitions].description);
}
assert.deepEqual(
  mcpVersion.catalog.map((t: any) => t.name).sort(),
  Object.keys(contosoToolDefinitions).sort(),
);
const robot = await api(
  `/agent-resources/${process.env.AGENT_STUDIO_AGENT_ID ?? "5"}`,
);
const before = JSON.parse(
  readFileSync(".data/contoso-connection/before.json", "utf8"),
);
assert.equal(robot.currentVersionId, before.robotVersionId);
const provenance = JSON.parse(
  readFileSync("data/contoso/provenance.json", "utf8"),
);
for (const p of products)
  assert.equal(
    createHash("sha256")
      .update(readFileSync(`data/contoso/manuals/product_info_${p.id}.md`))
      .digest("hex"),
    provenance.sourceSha256[`data/manual_info/manuals/product_info_${p.id}.md`],
  );
const liveRuns: { id: string; agentVersionId: number; status: string }[] = [];
if (process.argv.includes("--live")) {
  const traces = await api(`/executions?agentId=${state.agentId}&pageSize=5`);
  assert.equal(traces.items.length, 5);
  for (const trace of traces.items) {
    assert.equal(trace.status, "completed");
    const detail = await api(`/executions/${trace.id}`);
    assert.equal(
      detail.execution.composition.entryVersionId,
      state.agentVersionId,
    );
    liveRuns.push({
      id: trace.id,
      agentVersionId: detail.execution.composition.entryVersionId,
      status: trace.status,
    });
  }
}
const report = {
  checkedAt: new Date().toISOString(),
  verified: true,
  agentId: state.agentId,
  agentVersionId: state.agentVersionId,
  promptVersionId: state.promptVersionId,
  knowledgeBaseId: base.id,
  indexVersionId: index.id,
  indexedDocuments: docs.length,
  chunks: index.chunkCount,
  modelPlanVersionId: version.config.modelPlanVersionId,
  embeddingPlanVersionId: version.config.embeddingPlanVersionId,
  application: {
    id: app.id,
    apiEnabled: app.apiEnabled,
    websiteEnabled: app.websiteEnabled,
    allowedOrigins: app.allowedOrigins,
  },
  tools,
  mcpServerId: state.mcpServerId,
  mcpVersionId: mcpVersion.id,
  mcpToolCount: mcpVersion.catalog.length,
  robotVersionPreserved: robot.currentVersionId,
  rawManualsUnchanged: true,
  ...(liveRuns.length ? { liveRuns } : {}),
};
mkdirSync("output/verification", { recursive: true });
writeFileSync(
  "output/verification/contoso-platform.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
