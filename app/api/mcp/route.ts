import { serveMcp } from "@/lib/server/mcp-route";
import { robotMcpToolDefinitions, executeMcpTool } from "@/lib/robot/tools";
export const runtime = "nodejs";
export function POST(request: Request) {
  return serveMcp(
    request,
    robotMcpToolDefinitions,
    executeMcpTool,
    "demo-hub-robot-tools",
    process.env.TOOL_API_TOKEN,
  );
}
export function GET() {
  return Response.json(
    { error: "Stateless MCP: use POST /api/mcp" },
    { status: 405, headers: { Allow: "POST" } },
  );
}
export const DELETE = GET;
