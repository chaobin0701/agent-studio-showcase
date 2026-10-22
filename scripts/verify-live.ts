// Runs only on explicit invocation; uses real configured Agent calls.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { toolDefinitions, type ToolName } from "../lib/robot/tools";
import { sseParser } from "../lib/sse";
process.loadEnvFile(".env.local");
const base = process.env.SITE_ORIGIN!;
const toolHeaders = { authorization: `Bearer ${process.env.TOOL_API_TOKEN}` };
const input: Record<ToolName, Record<string, string>> = {
  list_demo_users: {},
  get_user_id: { user_id: "1003" },
  get_user_location: { user_id: "1003" },
  get_current_month: {},
  get_weather: { city: "杭州" },
  fetch_external_data: { user_id: "1003", month: "2025-12" },
  fill_context_for_report: {},
};
const evidence: Record<string, unknown> = {
  checkedAt: new Date().toISOString(),
  tools: [],
  scenarios: [],
};
assert.equal(
  (await fetch(`${base}/api/tools/get_weather?city=杭州`)).status,
  401,
);
const client = new Client({
  name: "agent-studio-showcase-live-verification",
  version: "1.0.0",
});
await client.connect(
  new StreamableHTTPClientTransport(new URL(base + "/api/mcp"), {
    requestInit: { headers: toolHeaders },
  }),
);
try {
  const listed = await client.listTools();
  assert.equal(listed.tools.length, 7);
  for (const name of Object.keys(toolDefinitions) as ToolName[]) {
    const response = await fetch(
      `${base}/api/tools/${name}?${new URLSearchParams(input[name])}`,
      { headers: toolHeaders },
    );
    assert.equal(response.status, 200);
    const http = await response.json();
    const mcp = await client.callTool({ name, arguments: input[name] });
    assert.equal(mcp.isError, undefined);
    const text = (mcp.content as { type: string; text: string }[]).find(
      (item) => item.type === "text",
    )!.text;
    assert.deepEqual(JSON.parse(text), http);
    (evidence.tools as string[]).push(name);
  }
} finally {
  await client.close();
}
console.log("HTTP/MCP parity: all 7 tools verified.");
let cookie = "";
async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: {
      cookie,
      origin: base,
      "content-type": "application/json",
      ...options.headers,
    },
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  return response;
}
const scenarios = [
  {
    name: "report",
    demo: "robot-assistant",
    message:
      "请根据我选择的模拟用户和示例月份生成一份清洁使用报告，引用实际工具记录。",
    match: /95%|20次|前5%/,
  },
  {
    name: "weather",
    demo: "robot-assistant",
    message: "查一下我所在城市的模拟天气，告诉我湿度并给出今天的清洁建议。",
    match: /85%|85％|85/,
  },
  {
    name: "knowledge",
    demo: "robot-assistant",
    message: "机器人无法正常回充，应该怎样逐步排查？",
    match: /回充|基站|充电/,
  },
];
for (const scenario of scenarios) {
  const created = await request("/api/hub/threads", {
    method: "POST",
    body: JSON.stringify({
      demo: scenario.demo,
      persona: "1003",
      month: "2025-12",
    }),
  });
  assert.equal(created.status, 201);
  const item = await created.json();
  const foreign = await fetch(`${base}/api/hub/threads/${item.id}`);
  assert.equal(foreign.status, 404);
  {
    const wrongDemo = await request("/api/chat/not-a-demo", {
      method: "POST",
      body: JSON.stringify({
        threadId: item.id,
        requestId: crypto.randomUUID(),
        message: "测试消息",
      }),
    });
    assert.equal(wrongDemo.status, 404);
  }
  // The correct Demo is the only route allowed to execute this thread.
  const response = await request(`/api/chat/${scenario.demo}`, {
    method: "POST",
    body: JSON.stringify({
      threadId: item.id,
      requestId: crypto.randomUUID(),
      message: scenario.message,
    }),
  });
  assert.equal(response.status, 200);
  const events: unknown[] = [];
  let result: any;
  const parser = sseParser(({ event, data }) => {
    events.push({ event, data });
    if (event === "done") result = data;
    if (event === "error") throw new Error(JSON.stringify(data));
  });
  const reader = response.body!.getReader();
  while (true) {
    const value = await reader.read();
    if (value.done) break;
    parser.push(value.value);
  }
  parser.end();
  assert.ok(result?.answer);
  assert.match(result.answer, scenario.match);
  const restored = await (await request(`/api/hub/threads/${item.id}`)).json();
  assert.ok(
    restored.messages.some(
      (message: { role: string }) => message.role === "assistant",
    ),
  );
  assert.equal(restored.pending, null);
  (evidence.scenarios as unknown[]).push({
    scenario: scenario.name,
    demo: scenario.demo,
    threadId: item.id,
    conversationId: result.conversationId,
    answer: result.answer,
    events,
  });
  console.log(`Real Agent scenario verified: ${scenario.name}`);
  mkdirSync("output/verification", { recursive: true });
  writeFileSync(
    "output/verification/live.json",
    JSON.stringify(evidence, null, 2),
  );
}
console.log(
  "Live integration, tool parity, ownership, routing and history verified.",
);
