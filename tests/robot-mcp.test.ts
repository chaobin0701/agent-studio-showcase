import test from "node:test";
import assert from "node:assert/strict";
import { robotMcpToolDefinitions, executeMcpTool, executeTool } from "../lib/robot/tools";
import { mcpToolConfig, migrateRobotMcp } from "../scripts/migrate-robot-mcp";

test("robot MCP exposes six business capabilities and cannot execute weather", () => {
  assert.equal(Object.keys(robotMcpToolDefinitions).length, 6);
  assert.ok(!Object.hasOwn(robotMcpToolDefinitions, "get_weather"));
  assert.throws(() => executeMcpTool("get_weather", { city: "杭州" }), /unknown_tool/);
  assert.throws(() => executeMcpTool("__proto__", {}), /unknown_tool/);
  assert.deepEqual(executeMcpTool("get_user_id", { user_id: "1001" }), executeTool("get_user_id", { user_id: "1001" }));
  assert.match(JSON.stringify(executeTool("get_weather", { city: "杭州" })), /模拟|非实时/);
});
test("MCP migration replaces HTTP transport without carrying endpoints, credentials, or altering tool policy", () => {
  const config = mcpToolConfig({ name: "get_user_id", description: "identity", inputSchema: { type: "object" } }, 12, {
    endpoint: { url: "https://old.example/", credentialId: 3 }, timeoutMs: 15000, readOnly: true, requiresApproval: false,
  });
  assert.equal(config.type, "mcp");
  assert.equal(config.target, "get_user_id");
  assert.equal(config.mcpVersionId, 12);
  assert.equal(config.readOnly, true);
  assert.equal(config.requiresApproval, false);
  assert.equal(Object.hasOwn(config, "endpoint"), false);
});
test("migration refuses an unrelated Agent draft before performing any writes", async () => {
  const calls: string[] = [];
  const api = async (path: string, method = "GET") => {
    calls.push(method);
    return { currentVersionId: 1, versions: [
      { id: 1, name: "robot", status: "published", config: { toolVersionIds: [1] } },
      { id: 2, name: "robot", status: "draft", config: { toolVersionIds: [2] } },
    ] };
  };
  await assert.rejects(migrateRobotMcp(api, 5, true), /unrelated draft/);
  assert.deepEqual(calls, ["GET"]);
});

test("native MCP discovery omits weather, rejects weather calls, and independent HTTP weather still works", async () => {
  process.env.TOOL_API_TOKEN = "robot-mcp-test-token";
  process.env.SITE_ORIGIN = "http://127.0.0.1:3300";
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
  const { POST } = await import("../app/api/mcp/route");
  const { GET } = await import("../app/api/tools/[tool]/route");
  const client = new Client({ name: "robot-mcp-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL("http://127.0.0.1:3300/api/mcp"), {
    requestInit: { headers: { authorization: `Bearer ${process.env.TOOL_API_TOKEN}` } },
    fetch: async (input, init) => {
      const request = new Request(input, init);
      request.headers.set("host", "127.0.0.1:3300");
      return POST(request);
    },
  });
  await client.connect(transport);
  try {
    assert.deepEqual((await client.listTools()).tools.map(tool => tool.name).sort(), Object.keys(robotMcpToolDefinitions).sort());
    assert.equal((await client.callTool({ name: "get_weather", arguments: { city: "杭州" } })).isError, true);
    const result = await GET(new Request("http://127.0.0.1:3300/api/tools/get_weather?city=杭州", { headers: { authorization: `Bearer ${process.env.TOOL_API_TOKEN}` } }), { params: Promise.resolve({ tool: "get_weather" }) });
    assert.equal(result.status, 200);
    assert.match(JSON.stringify(await result.json()), /模拟|非实时/);
  } finally { await client.close(); }
});
