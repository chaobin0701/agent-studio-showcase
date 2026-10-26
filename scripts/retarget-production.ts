// Explicit deployment operation. Retargets cloned Demo resources through the
// platform's normal draft, test, publish and MCP discovery APIs.
import { migrateRobotMcp } from "./migrate-robot-mcp";
import { platformAdmin } from "./platform-admin";

if (!process.argv.includes("--apply"))
  throw new Error("Pass --apply to retarget the selected platform workspace.");

const origin = process.env.SITE_ORIGIN;
if (!origin || new URL(origin).protocol !== "https:")
  throw new Error("Set SITE_ORIGIN to the production HTTPS origin.");

const api = await platformAdmin();
const resources = await api("/agent-resources");
const samples: Record<string, Record<string, unknown>> = {
  list_demo_users: {},
  get_user_id: { user_id: "1001" },
  get_user_location: { user_id: "1001" },
  get_current_month: {},
  get_weather: { city: "杭州" },
  fetch_external_data: { user_id: "1001", month: "2025-12" },
  fill_context_for_report: {},
  contoso_search_products: { category: "Tents", max_price: 2000, min_capacity: 4 },
  contoso_get_product: { product_id: "1" },
  contoso_compare_products: { product_ids: "1,15" },
  contoso_list_customers: {},
  contoso_get_customer: { customer_id: "1" },
  contoso_get_orders: { customer_id: "1" },
};
const groups = [
  {
    agentId: Number(process.env.AGENT_STUDIO_AGENT_ID ?? 5),
    keys: ["get_weather"],
    path: (key: string) => `/api/tools/${key}`,
  },
  {
    agentId: Number(process.env.AGENT_STUDIO_CONTOSO_AGENT_ID ?? 19),
    keys: Object.keys(samples).filter((key) => key.startsWith("contoso_")),
    path: (key: string) => `/api/contoso/tools/${key}`,
  },
];

for (const group of groups) {
  const versionMap = new Map<number, number>();
  for (const key of group.keys) {
    const resource = resources.resources.find((item: any) => item.kind === "tool" && item.key === key);
    if (!resource) throw new Error(`Missing existing tool ${key}`);
    let detail = await api(`/agent-resources/${resource.id}`);
    const published = detail.versions.filter((item: any) => item.status === "published").sort((a: any, b: any) => b.version - a.version)[0];
    if (!published) throw new Error(`Tool ${key} has no published version`);
    const endpoint = `${origin}${group.path(key)}`;
    let selected = published;
    if (published.config.endpoint.url !== endpoint) {
      let draft = detail.versions.find((item: any) => item.status === "draft");
      if (draft && JSON.stringify(draft.config) !== JSON.stringify(published.config) && draft.config.endpoint.url !== endpoint)
        throw new Error(`Tool ${key} has an unrelated draft; review it before deployment`);
      if (!draft) {
        const created = await api(`/agent-resources/tools/${resource.id}/draft`, "POST", { fromVersionId: published.id });
        detail = await api(`/agent-resources/${resource.id}`);
        draft = detail.versions.find((item: any) => item.id === created.versionId);
      }
      if (!draft) throw new Error(`Unable to prepare tool ${key}`);
      if (draft.config.endpoint.url !== endpoint) {
        await api(`/agent-resources/versions/${draft.id}`, "PATCH", {
          revision: draft.revision,
          config: { ...draft.config, endpoint: { ...draft.config.endpoint, url: endpoint } },
        });
      }
      const tested = await api(`/agent-resources/versions/${draft.id}/test`, "POST", { input: samples[key], execute: true });
      if (!tested.ok) throw new Error(`Production tool test failed: ${key}`);
      await api(`/agent-resources/versions/${draft.id}/publish`, "POST", {});
      selected = { ...draft, status: "published" };
      console.log(`Published ${key} version ${draft.id}`);
    }
    for (const version of detail.versions) versionMap.set(version.id, selected.id);
  }

  let agent = await api(`/agent-resources/${group.agentId}`);
  const current = agent.versions.find((item: any) => item.id === agent.currentVersionId);
  if (!current || current.status !== "published") throw new Error(`Agent ${group.agentId} has no active version`);
  const before: number[] = current.config.toolVersionIds;
  const after = before.map((id) => versionMap.get(id) ?? id);
  if (after.some((id, index) => id !== before[index])) {
    let draft = agent.versions.find((item: any) => item.status === "draft");
    const draftMatchesCurrent = draft && JSON.stringify(draft.config) === JSON.stringify(current.config);
    const draftAlreadyRetargeted = draft && JSON.stringify(draft.config.toolVersionIds) === JSON.stringify(after);
    if (draft && !draftMatchesCurrent && !draftAlreadyRetargeted)
      throw new Error(`Agent ${group.agentId} has an unrelated draft; review it before deployment`);
    if (!draft) {
      const created = await api(`/agent-resources/agents/${group.agentId}/draft`, "POST", { fromVersionId: current.id });
      agent = await api(`/agent-resources/${group.agentId}`);
      draft = agent.versions.find((item: any) => item.id === created.versionId);
    }
    if (!draft) throw new Error(`Unable to prepare Agent ${group.agentId}`);
    if (JSON.stringify(draft.config.toolVersionIds) !== JSON.stringify(after)) {
      await api(`/agent-resources/versions/${draft.id}`, "PATCH", {
        revision: draft.revision,
        config: { ...draft.config, toolVersionIds: after },
      });
    }
    const tested = await api(`/agent-resources/versions/${draft.id}/test`, "POST", {});
    if (!tested.ok) throw new Error(`Agent ${group.agentId} configuration test failed`);
    await api(`/agent-resources/versions/${draft.id}/publish`, "POST", {});
    console.log(`Published Agent ${group.agentId} version ${draft.id}`);
  }
}

const { servers } = await api("/external-tools/mcp");
for (const [key, path, count] of [
  ["demo_hub_robot", "/api/mcp", 6],
  ["demo_hub_contoso", "/api/contoso/mcp", 6],
] as const) {
  const server = servers.find((item: any) => item.key === key);
  if (!server) throw new Error(`Missing MCP server ${key}`);
  const expected = `${origin}${path}`;
  if (server.config.url === expected && server.toolCount === count) {
    console.log(`MCP ${key} already exposes ${count} tools`);
    continue;
  }
  let id = server.versionId;
  if (server.config.url !== expected) {
    const created = await api(`/external-tools/mcp/${server.id}/versions`, "POST", {
      versionId: id,
      config: { ...server.config, url: expected },
    });
    id = created.id;
  }
  const discovered = await api(`/external-tools/mcp/${server.id}/discover`, "POST", { versionId: id });
  if (!discovered.ok || discovered.toolCount !== count)
    throw new Error(`MCP ${key} discovery did not return ${count} tools`);
  console.log(`Discovered ${key} version ${discovered.id}: ${count} tools`);
}

await migrateRobotMcp(api, Number(process.env.AGENT_STUDIO_AGENT_ID ?? 5), true);
