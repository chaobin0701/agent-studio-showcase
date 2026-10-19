// Explicit operator action only. Creates/publishes the Contoso demo resources.
// Never invoked by ordinary dev/build/test commands. Admin secrets are not saved.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { platformAdmin } from "./platform-admin";
import {
  contosoToolDefinitions,
  type ContosoToolName,
} from "../lib/contoso/tools";
import { products } from "../lib/contoso/service";
import { productManual } from "../lib/contoso/manuals";
import { contosoDatasetVersion } from "../lib/contoso/localization";

if (!process.argv.includes("--apply") && !process.argv.includes("--prepare"))
  throw new Error(
    "Use --prepare or --apply for the explicitly authorized operator action.",
  );
const api = await platformAdmin();
const directory = ".data/contoso-connection";
mkdirSync(directory, { recursive: true, mode: 0o700 });
const state: Record<string, any> = existsSync(`${directory}/result.json`)
  ? JSON.parse(readFileSync(`${directory}/result.json`, "utf8"))
  : {};
const save = () =>
  writeFileSync(`${directory}/result.json`, JSON.stringify(state, null, 2), {
    mode: 0o600,
  });
function setEnv(name: string, value: string) {
  let text = readFileSync(".env.local", "utf8");
  text = new RegExp(`^${name}=.*$`, "m").test(text)
    ? text.replace(new RegExp(`^${name}=.*$`, "m"), `${name}=${value}`)
    : text.trimEnd() + `\n${name}=${value}\n`;
  writeFileSync(".env.local", text, { mode: 0o600 });
  process.env[name] = value;
}
if (!process.env.CONTOSO_TOOL_API_TOKEN)
  setEnv("CONTOSO_TOOL_API_TOKEN", randomBytes(32).toString("hex"));
const robot = await api(
  `/agent-resources/${process.env.AGENT_STUDIO_AGENT_ID ?? "5"}`,
);
const reference = robot.versions.find(
  (v: any) => v.id === robot.currentVersionId,
);
if (!reference || reference.status !== "published")
  throw new Error("No current published reference model configuration.");
const options = await api("/agent-resources/options");
const embedding = options.embeddingPlans.find(
  (p: any) => p.id === reference.config.embeddingPlanVersionId,
);
if (!embedding) throw new Error("No published embedding plan available.");
if (!existsSync(`${directory}/before.json`))
  writeFileSync(
    `${directory}/before.json`,
    JSON.stringify(
      {
        robotVersionId: robot.currentVersionId,
        workspaceId: process.env.DEMO_WORKSPACE_ID ?? "4",
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );

if (!state.credentialId) {
  const { credentials } = await api("/external-tools/credentials");
  state.credentialId = credentials.find(
    (c: any) => c.name === "Demo Hub Contoso read-only tools",
  )?.id;
  if (!state.credentialId)
    state.credentialId = (
      await api("/external-tools/credentials", "POST", {
        name: "Demo Hub Contoso read-only tools",
        kind: "bearer",
        secret: process.env.CONTOSO_TOOL_API_TOKEN,
      })
    ).id;
  save();
}
const corpusHash = createHash("sha256").update(products.map(productManual).join("\n\n")).digest("hex");
const knowledgeName = `Contoso Outdoor · 中文说明书（人民币模拟资料）· ${corpusHash.slice(0, 8)}`;
if (state.knowledgeBaseId && (state.knowledgeFormat !== 3 || state.knowledgeCorpusHash !== corpusHash)) {
  state.previousKnowledgeBaseId = state.knowledgeBaseId;
  delete state.knowledgeBaseId;
  delete state.indexVersionId;
  save();
}
if (!state.knowledgeBaseId) {
  const bases = await api("/knowledge-bases");
  state.knowledgeBaseId = bases.find(
    (b: any) =>
      b.name === knowledgeName &&
      !b.archivedAt,
  )?.id;
  if (!state.knowledgeBaseId)
    state.knowledgeBaseId = (
      await api("/knowledge-bases", "POST", {
        name: knowledgeName,
        description:
          "20 份中文改编户外商品说明书，采用独立人民币模拟定价；来源 Azure-Samples/contoso-chat，MIT。",
        enabledForChat: true,
        draftConfig: {
          indexMode: "high_quality",
          retrievalMode: "hybrid",
          embeddingProfileId: embedding.profileId,
          chunkMode: "general",
          chunkChars: 1000,
          overlapChars: 120,
          parentChars: 2400,
          childChars: 500,
          childOverlapChars: 50,
          topK: 8,
          lexicalThreshold: 0.15,
          vectorThreshold: 0.45,
        },
      })
    ).id;
  state.knowledgeFormat = 3;
  state.knowledgeDatasetVersion = contosoDatasetVersion;
  state.knowledgeCorpusHash = corpusHash;
  save();
}
const kb = state.knowledgeBaseId;
const documentList = async () => {
  const result = await api(
    `/knowledge-bases/${kb}/documents?limit=100&state=active`,
  );
  return Array.isArray(result)
    ? result
    : (result.items ?? result.documents ?? []);
};
let documents = await documentList();
const missing = products.filter(
  (p) => !documents.some((d: any) => d.originalFilename === `${p.name}.md`),
);
if (missing.length) {
  const form = new FormData();
  for (const p of missing)
    form.append(
      "files",
      new Blob(
        [
          productManual(p),
        ],
        {
          type: "text/markdown",
        },
      ),
      `${p.name}.md`,
    );
  await api(`/knowledge-bases/${kb}/documents/batch`, "POST", form);
  console.log(`Uploaded ${missing.length} manuals to knowledge base ${kb}.`);
}
const template = readFileSync("docs/contoso-agent-prompt.txt", "utf8");
const promptHash = createHash("sha256").update(template).digest("hex");
if (!state.promptVersionId || state.promptHash !== promptHash) {
  const prompts = await api("/prompts");
  const prompt =
    prompts.find((p: any) => p.promptKey === "demo_hub.contoso") ??
    (await api("/prompts", "POST", {
      promptKey: "demo_hub.contoso",
      name: "Contoso Outdoor · 装备顾问",
      promptType: "system",
      description: "商品比较、说明书检索、2023 模拟购买记录与搭配建议",
      template,
    }));
  let detail = await api(`/prompts/${prompt.id}`);
  let version = detail.versions[0];
  if (version.status === "published" && version.template !== template) {
    const created = await api(`/prompts/${prompt.id}/versions`, "POST", {
      template,
      variables: {},
      changeNote: "强化商品标题检索与结构化订单汇总指导。",
    });
    detail = await api(`/prompts/${prompt.id}`);
    version = detail.versions.find(
      (v: any) => v.versionId === created.versionId,
    );
  }
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
      throw new Error("Prompt review is not selectable.");
    await api(`/prompts/versions/${version.versionId}/publish`, "POST", {
      ...input,
      reviewHash: review.reviewHash,
      changeNote: "接入独立的 Contoso 示例资料、工具与知识库。",
    });
  }
  state.promptVersionId = version.versionId;
  state.promptHash = promptHash;
  save();
}
for (let attempt = 0; ; attempt++) {
  documents = await documentList();
  if (documents.some((d: any) => d.status === "failed"))
    throw new Error(
      "Manual processing failed; inspect document status in the platform.",
    );
  if (
    documents.length === 20 &&
    documents.every((d: any) => d.status === "ready")
  )
    break;
  if (attempt >= 150)
    throw new Error(
      "Documents remain queued; rerun this operator script to observe the existing work.",
    );
  if (attempt % 10 === 0)
    console.log(
      `Manual processing: ${documents.filter((d: any) => d.status === "ready").length}/20 ready.`,
    );
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
let base = await api(`/knowledge-bases/${kb}`);
if (!state.indexVersionId) {
  const versions = await api(`/knowledge-bases/${kb}/versions`);
  const building = versions.find((v: any) => v.status === "building");
  if (building) state.indexVersionId = building.id;
  else if (
    base.activeIndexVersionId &&
    documents.every((d: any) => d.inCurrentIndex)
  )
    state.indexVersionId = base.activeIndexVersionId;
  else
    state.indexVersionId = (
      await api(`/knowledge-bases/${kb}/versions`, "POST", {
        activateOnReady: true,
      })
    ).id;
  save();
}
for (let attempt = 0; ; attempt++) {
  const versions = await api(`/knowledge-bases/${kb}/versions`);
  const version = versions.find((v: any) => v.id === state.indexVersionId);
  if (version?.status === "failed")
    throw new Error(
      `Knowledge index ${version.id} failed: ${version.errorMessage}`,
    );
  if (version?.status === "ready") {
    base = await api(`/knowledge-bases/${kb}`);
    // Automatic indexing can have advanced while an earlier snapshot was building.
    // Never replace a newer complete index with the previously observed version.
    if (!base.activeIndexVersionId || base.activeIndexVersionId <= version.id) {
      if (base.activeIndexVersionId !== version.id)
        await api(
          `/knowledge-bases/${kb}/versions/${version.id}/activate`,
          "POST",
          {},
        );
    }
    documents = await documentList();
    if (
      !documents.every(
        (d: any) => d.inCurrentIndex && d.indexRevision === d.indexedRevision,
      )
    ) {
      const building = versions.find((v: any) => v.status === "building");
      state.indexVersionId =
        building?.id ??
        (
          await api(`/knowledge-bases/${kb}/versions`, "POST", {
            activateOnReady: true,
          })
        ).id;
      save();
      console.log(
        `Earlier index did not cover all 20 current documents; observing index ${state.indexVersionId}.`,
      );
      continue;
    }
    base = await api(`/knowledge-bases/${kb}`);
    state.indexVersionId = base.activeIndexVersionId;
    save();
    console.log(
      `Knowledge index ${version.id} ready: ${version.chunkCount} chunks.`,
    );
    break;
  }
  if (attempt >= 300)
    throw new Error(
      "Index is still running; preserve the existing job and rerun to observe it.",
    );
  if (attempt % 10 === 0)
    console.log(`Waiting for knowledge index ${state.indexVersionId}.`);
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
if (process.argv.includes("--prepare")) {
  console.log(
    "Knowledge and prompt prepared; application creation requires --apply.",
  );
  process.exit(0);
}

const inputs: Record<ContosoToolName, Record<string, unknown>> = {
  contoso_search_products: {
    category: "Tents",
    max_price: 2000,
    min_capacity: 4,
  },
  contoso_get_product: { product_id: "1" },
  contoso_compare_products: { product_ids: "1,15" },
  contoso_list_customers: {},
  contoso_get_customer: { customer_id: "1" },
  contoso_get_orders: { customer_id: "1" },
};
state.tools ??= {};
state.toolConfigHashes ??= {};
const existing = await api("/agent-resources");
for (const name of Object.keys(contosoToolDefinitions) as ContosoToolName[]) {
  const definition = contosoToolDefinitions[name];
  const config = {
    description: definition.description,
    type: "rest",
    parameters: z.toJSONSchema(definition.schema),
    endpoint: {
      connection: "external",
      url: `${process.env.SITE_ORIGIN}/api/contoso/tools/${name}`,
      method: "GET",
      credentialId: state.credentialId,
    },
    timeoutMs: 15000,
    maxRetries: 0,
    readOnly: true,
    requiresApproval: false,
  };
  const configHash = createHash("sha256").update(JSON.stringify(config)).digest("hex");
  let ids = state.tools[name];
  if (!ids) {
    const resource = existing.resources.find(
      (r: any) => r.kind === "tool" && r.key === name,
    );
    ids = resource
      ? { resourceId: resource.id, versionId: resource.versions[0].id }
      : await api("/agent-resources", "POST", {
          kind: "tool",
          key: name,
          name: `Contoso · ${name}`,
          config,
        });
    state.tools[name] = ids;
    save();
  }
  let detail = await api(`/agent-resources/${ids.resourceId}`);
  let version = detail.versions.find((v: any) => v.id === ids.versionId);
  if (state.toolConfigHashes[name] !== configHash) {
    const draft = await api(`/agent-resources/tools/${ids.resourceId}/draft`, "POST", { fromVersionId: ids.versionId });
    detail = await api(`/agent-resources/${ids.resourceId}`);
    version = detail.versions.find((v: any) => v.id === draft.versionId);
    await api(`/agent-resources/versions/${version.id}`, "PATCH", { revision: version.revision, config });
    ids = { ...ids, versionId: version.id };
    state.tools[name] = ids;
    save();
  }
  if (version.status !== "published") {
    const tested = await api(
      `/agent-resources/versions/${version.id}/test`,
      "POST",
      { input: inputs[name], execute: true },
    );
    if (!tested.ok)
      throw new Error(
        `Tool execution failed: ${name}: ${JSON.stringify(tested)}`,
      );
    await api(`/agent-resources/versions/${version.id}/publish`, "POST", {});
  }
  state.toolConfigHashes[name] = configHash;
  save();
  console.log(`Verified published HTTP tool: ${name}`);
}
if (!state.mcpServerId) {
  const { servers } = await api("/external-tools/mcp");
  state.mcpServerId =
    servers.find((s: any) => s.key === "demo_hub_contoso")?.id ??
    (
      await api("/external-tools/mcp", "POST", {
        key: "demo_hub_contoso",
        name: "Demo Hub Contoso Tools",
        config: {
          url: `${process.env.SITE_ORIGIN}/api/contoso/mcp`,
          credentialId: state.credentialId,
          timeoutMs: 15000,
        },
      })
    ).id;
  save();
}
if (!state.mcpVersionId || state.mcpDatasetVersion !== contosoDatasetVersion) {
  const server = await api(`/external-tools/mcp/${state.mcpServerId}`);
  const version = server.versions[0];
  const result =
    version.catalog?.length === 6 && state.mcpDatasetVersion === contosoDatasetVersion
      ? version
      : await api(`/external-tools/mcp/${state.mcpServerId}/discover`, "POST", {
          versionId: version.id,
        });
  if (result.toolCount !== undefined && (!result.ok || result.toolCount !== 6))
    throw new Error("Contoso MCP discovery did not return all six tools.");
  state.mcpVersionId = result.id;
  state.mcpDatasetVersion = contosoDatasetVersion;
  save();
}
if (!state.agentId) {
  const resource = existing.resources.find(
    (r: any) => r.kind === "agent" && r.key === "contoso_outdoor",
  );
  const created = resource
    ? { resourceId: resource.id, versionId: resource.versions[0].id }
    : await api("/agent-resources", "POST", {
        kind: "agent",
        key: "contoso_outdoor",
        name: "Contoso Outdoor · 户外装备顾问",
        config: {
          responsibility:
            "基于模拟目录、商品说明书与购买记录提供户外装备选购比较、使用指导和搭配建议。",
          promptVersionId: state.promptVersionId,
          modelPlanVersionId: reference.config.modelPlanVersionId,
          embeddingPlanVersionId: reference.config.embeddingPlanVersionId,
          knowledgeBaseIds: [kb],
          skillVersionIds: [],
          toolVersionIds: Object.values(state.tools).map(
            (t: any) => t.versionId,
          ),
          retrieval: {
            retrievalMode: "hybrid",
            topK: 8,
            contextChars: 20000,
            lexicalThreshold: 0.15,
            vectorThreshold: 0.45,
          },
          runtime: {
            maxToolCalls: 12,
            maxPlannerRounds: 12,
            toolTimeoutMs: 30000,
            maxToolResultChars: 26000,
          },
          welcome: {
            title: "下一次露营，想带些什么？",
            description: "选装备、读说明书，也可以看看模拟客户的购买记录。",
            suggestedQuestions: [
              "四个人露营，预算 2,000 元，有哪些帐篷可选？",
              "远行者 X4 四人帐篷如何搭建？",
              "我的模拟购买记录中有哪些装备？",
            ],
          },
        },
      });
  state.agentId = created.resourceId;
  state.agentVersionId = created.versionId;
  save();
}
let agent = await api(`/agent-resources/${state.agentId}`);
let selected = agent.versions.find((v: any) => v.id === state.agentVersionId);
if (
  selected.config.promptVersionId !== state.promptVersionId ||
  selected.config.knowledgeBaseIds[0] !== kb ||
  JSON.stringify([...selected.config.toolVersionIds].sort()) !== JSON.stringify(Object.values(state.tools).map((t: any) => t.versionId).sort()) ||
  selected.config.retrieval.topK !== 8
) {
  const draft = await api(
    `/agent-resources/agents/${state.agentId}/draft`,
    "POST",
    {},
  );
  agent = await api(`/agent-resources/${state.agentId}`);
  selected = agent.versions.find((v: any) => v.id === draft.versionId);
  await api(`/agent-resources/versions/${selected.id}`, "PATCH", {
    revision: selected.revision,
    config: {
      ...selected.config,
      promptVersionId: state.promptVersionId,
      knowledgeBaseIds: [kb],
      toolVersionIds: Object.values(state.tools).map((t: any) => t.versionId),
      welcome: {
        title: "下一次露营，想带些什么？",
        description: "查中文装备、读中文说明书，也可以看看人民币模拟购买记录。",
        suggestedQuestions: ["四个人露营，预算 2,000 元，有哪些帐篷可选？", "远行者 X4 四人帐篷如何搭建？", "我的模拟购买记录中有哪些装备？"],
      },
      retrieval: { ...selected.config.retrieval, topK: 8 },
    },
  });
  state.previousAgentVersionId = state.agentVersionId;
  state.agentVersionId = selected.id;
  save();
  agent = await api(`/agent-resources/${state.agentId}`);
}
if (
  agent.versions.find((v: any) => v.id === state.agentVersionId)?.status !==
  "published"
) {
  const tested = await api(
    `/agent-resources/versions/${state.agentVersionId}/test`,
    "POST",
    {},
  );
  if (!tested.ok) throw new Error("Agent configuration test failed.");
  await api(
    `/agent-resources/versions/${state.agentVersionId}/publish`,
    "POST",
    {},
  );
}
if (!state.appId) {
  const apps = await api("/integrations");
  state.appId =
    apps.find(
      (a: any) =>
        a.agentId === state.agentId && a.name === "Demo Hub · Contoso Outdoor",
    )?.id ??
    (
      await api("/integrations", "POST", {
        agentId: state.agentId,
        name: "Demo Hub · Contoso Outdoor",
        enabled: true,
        websiteEnabled: false,
        apiEnabled: true,
        allowedOrigins: [],
        scopes: ["chat:write", "conversations:read", "conversations:delete"],
        requestsPerMinute: 30,
        concurrency: 2,
        dailyRequests: 500,
        dailyTokenLimit: 1000000,
      })
    ).id;
  save();
}
if (!process.env.AGENT_STUDIO_CONTOSO_API_KEY) {
  const key = await api(`/integrations/${state.appId}/keys`, "POST", {
    name: "Demo Hub Contoso server",
    scopes: ["chat:write", "conversations:read", "conversations:delete"],
  });
  setEnv("AGENT_STUDIO_CONTOSO_API_KEY", key.apiKey);
  state.keyId = key.id;
  save();
}
setEnv("AGENT_STUDIO_CONTOSO_AGENT_ID", String(state.agentId));
state.verifiedAt = new Date().toISOString();
save();
console.log(
  `Contoso Agent ${state.agentId}, version ${state.agentVersionId}, application ${state.appId} configured. Server credential saved without printing. Existing Robot Agent untouched.`,
);
