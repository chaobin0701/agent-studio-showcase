// Explicit operator check. Calls the configured live Agent and public Demo
// tools; ordinary tests and builds never run this file.
import assert from "node:assert/strict";

const base = process.env.SITE_ORIGIN;
assert.ok(base?.startsWith("https://"), "SITE_ORIGIN must be an HTTPS origin");
const tokens = {
  robot: process.env.TOOL_API_TOKEN,
  contoso: process.env.CONTOSO_TOOL_API_TOKEN,
};
assert.ok(tokens.robot && tokens.contoso, "Tool tokens are required");

const cases = [
  {
    path: "/api/mcp",
    prefix: "/api/tools/",
    token: tokens.robot,
    inputs: {
      list_demo_users: {},
      get_user_id: { user_id: "1001" },
      get_user_location: { user_id: "1001" },
      get_current_month: {},
      get_weather: { city: "杭州" },
      fetch_external_data: { user_id: "1001", month: "2025-12" },
      fill_context_for_report: {},
    },
  },
  {
    path: "/api/contoso/mcp",
    prefix: "/api/contoso/tools/",
    token: tokens.contoso,
    inputs: {
      contoso_search_products: { category: "Tents", max_price: 2000, min_capacity: 4 },
      contoso_get_product: { product_id: "1" },
      contoso_compare_products: { product_ids: "1,15" },
      contoso_list_customers: {},
      contoso_get_customer: { customer_id: "1" },
      contoso_get_orders: { customer_id: "1" },
    },
  },
];

for (const demo of ["robot-assistant", "contoso-outdoor"]) {
  const response = await fetch(`${base}/api/hub/status?demo=${demo}`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).connected, true);
}
const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
for (const group of cases) {
  assert.equal((await fetch(`${base}${group.prefix}${Object.keys(group.inputs)[0]}`)).status, 401);
  const client = new Client({ name: "production-verification", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}${group.path}`), {
    requestInit: { headers: { authorization: `Bearer ${group.token}` } },
  }));
  try {
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), Object.keys(group.inputs).sort());
    for (const [name, input] of Object.entries(group.inputs)) {
      const query = new URLSearchParams(Object.entries(input).map(([key, value]) => [key, String(value)]));
      const http = await fetch(`${base}${group.prefix}${name}?${query}`, {
        headers: { authorization: `Bearer ${group.token}` },
      });
      assert.equal(http.status, 200, name);
      const payload = await http.json();
      const mcp = await client.callTool({ name, arguments: input });
      assert.ok(!mcp.isError, name);
      const text = mcp.content.find((item) => item.type === "text")?.text;
      assert.deepEqual(JSON.parse(text), payload, name);
      if (name === "contoso_get_orders") assert.deepEqual(
        { totalAmount: payload.summary.totalAmount, currency: payload.summary.currency },
        { totalAmount: 8595, currency: "CNY" },
      );
    }
  } finally {
    await client.close();
  }
  console.log(`HTTP/MCP verified: ${Object.keys(group.inputs).length} tools at ${group.path}`);
}
const noMatch = await fetch(`${base}/api/contoso/tools/contoso_search_products?category=Tents&max_price=100&min_capacity=4`, {
  headers: { authorization: `Bearer ${tokens.contoso}` },
});
assert.equal(noMatch.status, 200);
assert.equal((await noMatch.json()).products.length, 0);
const unknown = await fetch(`${base}/api/contoso/tools/contoso_get_product?product_id=1&unknown=1`, {
  headers: { authorization: `Bearer ${tokens.contoso}` },
});
assert.equal(unknown.status, 400);
console.log("Tool boundaries verified: authorization, unknown input and no-match budget");

if (process.argv.includes("--tools-only")) process.exit(0);

let cookie = "";
async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { cookie, origin: base, "content-type": "application/json", ...options.headers },
    signal: AbortSignal.timeout(240000),
  });
  const updated = response.headers.get("set-cookie");
  if (updated) cookie = updated.split(";")[0];
  return response;
}
async function create(demo, persona, month) {
  const response = await request("/api/hub/threads", {
    method: "POST",
    body: JSON.stringify({ demo, persona, month }),
  });
  assert.equal(response.status, 201, await response.clone().text());
  return response.json();
}
async function chat(item, message) {
  const response = await request(`/api/chat/${item.demo}`, {
    method: "POST",
    body: JSON.stringify({ threadId: item.id, requestId: crypto.randomUUID(), message }),
  });
  if (!response.ok) throw new Error(`Chat ${response.status}: ${await response.text()}`);
  let result;
  const tools = new Set();
  for (const block of (await response.text()).split(/\r?\n\r?\n/)) {
    const event = block.match(/^event: (.+)$/m)?.[1];
    const raw = block.match(/^data: (.+)$/m)?.[1];
    if (!event || !raw) continue;
    const data = JSON.parse(raw);
    if (event === "error") throw new Error(`Agent error: ${data.message ?? "unknown"}`);
    if (event === "progress" && data.stage === "tool" && data.status === "completed" && data.ok) tools.add(data.tool);
    if (event === "done") result = data;
  }
  assert.ok(result?.answer, "Agent did not return a final answer");
  const restored = await (await request(`/api/hub/threads/${item.id}`)).json();
  assert.equal(restored.pending, null);
  assert.ok(restored.messages.some((entry) => entry.role === "assistant" && entry.content === result.answer));
  return { answer: result.answer, citations: result.citations ?? [], tools: [...tools] };
}

const robot = await create("robot-assistant", "1003", "2025-12");
assert.equal((await fetch(`${base}/api/hub/threads/${robot.id}`)).status, 404);
const weather = await chat(robot, "查询我所在城市的模拟天气和湿度，再给出今天的拖地建议。请调用天气工具。 ");
assert.ok(weather.tools.includes("get_weather"));
console.log(`Robot weather verified: ${weather.answer.length} characters`);

const contoso = await create("contoso-outdoor", "contoso-1", "2023");
assert.equal((await request("/api/chat/robot-assistant", {
  method: "POST",
  body: JSON.stringify({ threadId: contoso.id, requestId: crypto.randomUUID(), message: "跨 Demo 测试" }),
})).status, 404);
const shopping = await chat(contoso, "四个人露营，帐篷预算不超过 2,000 元。请调用商品工具，列出符合人数和预算的帐篷、人民币模拟价格和人数。不要放宽条件。");
assert.ok(shopping.tools.includes("contoso_search_products"));
assert.match(shopping.answer, /远行者.*X4/);
assert.match(shopping.answer, /1[,]?699/);
console.log(`Contoso shopping verified: ${shopping.answer.length} characters`);
const manual = await chat(contoso, "这款远行者 X4 四人帐篷如何搭建？请检索中文商品说明书，列出主要步骤并标明来源。");
assert.match(manual.answer, /搭建|帐篷/);
assert.ok(manual.citations.length > 0, "Manual answer has no knowledge citation");
console.log(`Contoso Chinese manual verified: ${manual.citations.length} citations`);
const orders = await chat(contoso, "请调用购买记录工具，汇总张晨在 2023 年的模拟订单总金额，以人民币给出结果。");
assert.ok(orders.tools.includes("contoso_get_orders"));
assert.match(orders.answer, /8[,]?595/);
console.log(`Contoso purchase history verified: ${orders.answer.length} characters`);
