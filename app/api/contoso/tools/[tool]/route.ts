import { z } from "zod";
import { executeContosoTool } from "@/lib/contoso/tools";
import { authorizeTool, fail, HttpError } from "@/lib/server/security";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ tool: string }> },
) {
  try {
    authorizeTool(request, process.env.CONTOSO_TOOL_API_TOKEN ?? "");
    const { tool } = await context.params;
    return Response.json(
      executeContosoTool(
        tool,
        Object.fromEntries(new URL(request.url).searchParams),
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return Response.json(
        {
          error: "工具参数无效",
          issues: error.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
        },
        { status: 400 },
      );
    if (error instanceof Error && error.message === "unknown_tool")
      return fail(new HttpError(404, "工具不存在"));
    return fail(error);
  }
}
