// Explicit invocation only: exercises real Agent Studio models and published tools.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { sseParser } from "../lib/sse";
import {
  contosoToolDefinitions,
  type ContosoToolName,
} from "../lib/contoso/tools";
import { customerOrders } from "../lib/contoso/service";

process.loadEnvFile(".env.local");
const base = process.env.SITE_ORIGIN!;
const headers = {
  authorization: `Bearer ${process.env.CONTOSO_TOOL_API_TOKEN}`,
};
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
assert.ok(
  process.env.AGENT_STUDIO_CONTOSO_API_KEY,
  "Configure the Contoso connection first.",
);
assert.equal(
  (await fetch(base + "/api/contoso/tools/contoso_get_orders?customer_id=1"))
    .status,
  401,
);
assert.equal(
  (
    await fetch(base + "/api/contoso/tools/contoso_get_orders?customer_id=1", {
      headers: { authorization: `Bearer ${process.env.TOOL_API_TOKEN}` },
    })
  ).status,
  401,
);
assert.equal(
  (
    await fetch(base + "/api/contoso/tools/contoso_get_orders?customer_id=1", {
      headers: { ...headers, origin: "https://untrusted.example" },
    })
  ).status,
  403,
);
const client = new Client({
  name: "contoso-live-verification",
  version: "1.0.0",
});
await client.connect(
  new StreamableHTTPClientTransport(new URL(base + "/api/contoso/mcp"), {
    requestInit: { headers },
  }),
);
try {
  const listed = await client.listTools();
  assert.deepEqual(
    listed.tools.map((t) => t.name).sort(),
    Object.keys(contosoToolDefinitions).sort(),
  );
  for (const name of Object.keys(inputs) as ContosoToolName[]) {
    const query = new URLSearchParams(
      Object.entries(inputs[name]).map(([key, value]) => [key, String(value)]),
    );
    const http = await fetch(`${base}/api/contoso/tools/${name}?${query}`, {
      headers,
    });
    assert.equal(http.status, 200, name);
    const mcp = await client.callTool({ name, arguments: inputs[name] });
    assert.ok(!mcp.isError, name);
    const text = (mcp.content as { type: string; text: string }[]).find(
      (c) => c.type === "text",
    )!.text;
    assert.deepEqual(JSON.parse(text), await http.json());
  }
} finally {
  await client.close();
}
console.log(
  "All six HTTP/MCP tools agree; credentials and Origin checks passed.",
);
if (process.argv.includes("--tools-only")) process.exit(0);

mkdirSync("output/verification", { recursive: true });
const tag = process.env.CONTOSO_VERIFICATION_TAG ?? "current";
if (!/^[a-z0-9-]+$/.test(tag)) throw new Error("Invalid verification tag.");
const journalFile = `.data/contoso-live-${tag}.json`;
const journal: any = existsSync(journalFile)
  ? JSON.parse(readFileSync(journalFile, "utf8"))
  : { cookie: "", cases: {} };
const evidence: any = {
  checkedAt: new Date().toISOString(),
  tools: Object.keys(inputs),
  scenarios: [],
};
function save() {
  writeFileSync(journalFile, JSON.stringify(journal, null, 2), { mode: 0o600 });
  writeFileSync(
    "output/verification/contoso-live.json",
    JSON.stringify(evidence, null, 2),
  );
}
async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: {
      cookie: journal.cookie,
      origin: base,
      "content-type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(240000),
  });
  const cookie = response.headers.get("set-cookie");
  if (cookie) {
    journal.cookie = cookie.split(";")[0];
    save();
  }
  return response;
}
async function create(demo: string, persona: string, month: string) {
  const response = await request("/api/hub/threads", {
    method: "POST",
    body: JSON.stringify({ demo, persona, month }),
  });
  assert.equal(response.status, 201, await response.clone().text());
  return response.json();
}
let shared = journal.sharedThread;
if (!shared) {
  shared = await create("contoso-outdoor", "contoso-1", "2023");
  journal.sharedThread = shared;
  save();
}
assert.equal((await fetch(`${base}/api/hub/threads/${shared.id}`)).status, 404);
assert.equal(
  (
    await request("/api/hub/threads", {
      method: "POST",
      body: JSON.stringify({
        demo: "contoso-outdoor",
        persona: "1001",
        month: "2025-12",
      }),
    })
  ).status,
  400,
);
assert.equal(
  (
    await request("/api/chat/robot-assistant", {
      method: "POST",
      body: JSON.stringify({
        threadId: shared.id,
        requestId: crypto.randomUUID(),
        message: "测试跨 Demo 路由",
      }),
    })
  ).status,
  404,
);

async function scenario(name: string, message: string, item = shared) {
  const previous = journal.cases[name];
  const testCase = previous ?? {
    threadId: item.id,
    requestId: crypto.randomUUID(),
    message,
    demo: item.demo,
  };
  assert.equal(
    testCase.message,
    message,
    "Do not reuse a request ID with changed content.",
  );
  journal.cases[name] = testCase;
  save();
  let result: any = testCase.result;
  let events: any[] = testCase.events ?? [];
  if (!result) {
    if (testCase.started) {
      const recovered = await request(
        `/api/hub/threads/${testCase.threadId}/recover`,
        { method: "POST" },
      );
      assert.ok(
        recovered.ok,
        "Existing request is pending; inspect its run before retrying.",
      );
    }
    testCase.started = true;
    save();
    const response = await request(`/api/chat/${testCase.demo}`, {
      method: "POST",
      body: JSON.stringify({
        threadId: testCase.threadId,
        requestId: testCase.requestId,
        message: testCase.message,
      }),
    });
    if (!response.ok)
      throw new Error(`Chat ${response.status}: ${await response.text()}`);
    assert.equal(response.status, 200);
    const parser = sseParser(({ event, data }) => {
      events.push({ event, data });
      if (event === "done") result = data;
      if (event === "error")
        throw new Error(String(data.message ?? "Agent error"));
    });
    const reader = response.body!.getReader();
    try {
      while (true) {
        const value = await reader.read();
        if (value.done) break;
        parser.push(value.value);
      }
      parser.end();
    } finally {
      reader.releaseLock();
    }
    assert.ok(
      result?.answer,
      "An upstream done event must provide the actual answer.",
    );
    testCase.result = result;
    testCase.events = events;
    save();
  }
  const progress = [
    ...events.filter((e) => e.event === "progress").map((e) => e.data),
    ...(result.progressEvents ?? []),
  ];
  const tools = [
    ...new Set(
      progress
        .filter(
          (p: any) => p.stage === "tool" && p.status === "completed" && p.ok,
        )
        .map((p: any) => p.tool),
    ),
  ];
  const record = {
    name,
    threadId: testCase.threadId,
    requestId: testCase.requestId,
    conversationId: result.conversationId,
    answer: result.answer,
    citations: result.citations ?? [],
    tools,
    events,
  };
  evidence.scenarios.push(record);
  save();
  const restored = await (
    await request(`/api/hub/threads/${testCase.threadId}`)
  ).json();
  assert.equal(restored.pending, null);
  assert.ok(
    restored.messages.some(
      (m: any) => m.role === "assistant" && m.content === result.answer,
    ),
  );
  console.log(
    `Completed real Agent case ${name}: ${tools.join(", ")}; ${result.answer.length} characters.`,
  );
  return record;
}
const shopping = await scenario(
  "shopping",
  "四个人露营，帐篷预算不超过 2,000 元。请查询所有同时符合人数和预算的帐篷，列出商品ID、人民币模拟价格和人数。不要放宽条件。",
);
assert.ok(shopping.tools.includes("contoso_search_products"));
assert.match(shopping.answer, /远行者.*X4/);
assert.match(shopping.answer, /1[,]?699/);
assert.match(shopping.answer, /人民币|CNY|元|¥|￥/);
assert.doesNotMatch(shopping.answer, /250\s*(?:USD|美元)/i);
const manual = await scenario(
  "manual-followup",
  "这款帐篷如何搭建？请检索它的商品说明书，用中文列出主要步骤，并标明来源。",
);
assert.ok(
  manual.tools.includes("search_knowledge"),
  "Manual answers must actually retrieve the platform knowledge base.",
);
assert.ok(
  manual.citations.some((c: any) =>
    /远行者.*X4/.test(c.documentTitle ?? c.originalFilename ?? ""),
  ),
  "A matching manual citation must be returned.",
);
assert.match(manual.answer, /搭建|帐篷|tent/i);
assert.match(manual.answer, /场地|选址|平坦|平整|平地|水平[^。\n]{0,12}(?:地面|区域|位置)/);
assert.match(manual.answer, /帐杆|支架|撑杆|杆/);
assert.match(manual.answer, /防雨罩|雨罩|雨篷|雨布/);
assert.doesNotMatch(
  manual.answer,
  /没有可检索到的|搭建步骤.*资料缺失|没有.*搭建步骤/,
);
const orders = await scenario(
  "orders",
  "查我的全部 2023 年模拟购买记录，逐笔列出日期、商品、数量和人民币总额，最后计算所有记录的总额与总件数。不要遗漏任何记录。",
);
assert.ok(orders.tools.includes("contoso_get_orders"));
assert.match(orders.answer, /8[,]?595/);
assert.match(orders.answer, /张晨/);
assert.match(orders.answer, /2023/);
const zeroThread =
  journal.zeroThread ?? (await create("contoso-outdoor", "contoso-1", "2023"));
journal.zeroThread = zeroThread;
save();
const zero = await scenario(
  "no-match",
  "八个人露营，帐篷预算最多 2,000 元。请查目录，有同时符合这两个条件的帐篷吗？不允许放宽预算和人数。",
  zeroThread,
);
assert.ok(zero.tools.includes("contoso_search_products"));
assert.match(zero.answer, /没有|无符合|未找到|无匹配|不满足|不符合|暂无|未能/);
const other =
  journal.otherThread ?? (await create("contoso-outdoor", "contoso-3", "2023"));
journal.otherThread = other;
save();
const otherOrders = await scenario(
  "other-customer",
  "查询我的 2023 年模拟购买记录，列出商品和每笔金额，并计算总金额。请先确认当前客户背景。",
  other,
);
assert.ok(otherOrders.tools.includes("contoso_get_orders"));
const total = customerOrders("3")!.reduce((sum, o) => sum + o.total, 0);
assert.equal(total, 2346);
assert.match(otherOrders.answer, /王浩/);
assert.ok(otherOrders.answer.replaceAll(",", "").includes(String(total)));
const list = await (
  await request("/api/hub/threads?demo=contoso-outdoor")
).json();
assert.ok(list.threads.every((t: any) => t.demo === "contoso-outdoor"));
const robotList = await (
  await request("/api/hub/threads?demo=robot-assistant")
).json();
assert.ok(!robotList.threads.some((t: any) => t.id === shared.id));
evidence.verified = true;
save();
console.log(
  "Contoso live verification passed: native tools, platform RAG citations, multi-turn history, prices, order totals, zero results, customer and Demo isolation.",
);
