import { serveMcp } from "@/lib/server/mcp-route";
import {
  contosoToolDefinitions,
  executeContosoTool,
} from "@/lib/contoso/tools";
export const runtime = "nodejs";
export function POST(request: Request) {
  return serveMcp(
    request,
    contosoToolDefinitions,
    executeContosoTool,
    "demo-hub-contoso-tools",
    process.env.CONTOSO_TOOL_API_TOKEN,
  );
}
export function GET() {
  return Response.json(
    { error: "Stateless MCP: use POST /api/contoso/mcp" },
    { status: 405, headers: { Allow: "POST" } },
  );
}
export const DELETE = GET;
