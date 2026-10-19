import { z } from "zod";
import { executeTool } from "@/lib/robot/tools";
import { authorizeTool, fail, HttpError } from "@/lib/server/security";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ tool: string }> },
) {
  try {
    authorizeTool(request);
    const { tool } = await context.params;
    const input = Object.fromEntries(new URL(request.url).searchParams);
    return Response.json(executeTool(tool, input), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return Response.json(
        {
          error: "工具参数无效",
          issues: error.issues.map((item) => ({
            path: item.path,
            message: item.message,
          })),
        },
        { status: 400 },
      );
    if (error instanceof Error && error.message === "unknown_tool")
      return fail(new HttpError(404, "工具不存在"));
    return fail(error);
  }
}
