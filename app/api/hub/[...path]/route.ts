import { z } from "zod";
import { findDemo } from "@/lib/catalog";
import { getProfile, months, robotSnapshot } from "@/lib/robot/service";
import { validDemoContext } from "@/lib/demo-profiles";
import { contosoSnapshot, getCustomer } from "@/lib/contoso/service";
import {
  chatStatus,
  conversationConfigurations,
  agentRequest,
  history,
  platformUser,
  recoverRequest,
} from "@/lib/server/agent-studio";
import {
  createThread,
  removeThread,
  thread,
  threads,
  pending,
} from "@/lib/server/store";
import { fail, HttpError, sameOrigin, visitor } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: Request, context: Context) {
  try {
    const { path } = await context.params;
    const url = new URL(request.url);
    if (path[0] === "status") {
      const status = await chatStatus(url.searchParams.get("demo") ?? "robot-assistant");
      return Response.json({ ...status, mode: "agent-studio" });
    }
    if (path[0] === "contoso") {
      const customer = url.searchParams.get("customer") ?? "1";
      if (!getCustomer(customer)) throw new HttpError(400, "无效的模拟客户");
      return Response.json(contosoSnapshot(customer));
    }
    if (path[0] === "robot") {
      const persona = url.searchParams.get("user") ?? "1001";
      const month = url.searchParams.get("month") ?? months[0];
      if (!getProfile(persona) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
        throw new HttpError(400, "无效的模拟用户或月份");
      return Response.json(robotSnapshot(persona, month));
    }
    const owner = await visitor();
    if (path[0] === "threads" && path.length === 1) {
      const demo = url.searchParams.get("demo") ?? "";
      if (!findDemo(demo)) throw new HttpError(404, "Demo 不存在");
      return Response.json({
        threads: threads(owner, demo).map(({ owner: _, ...item }) => item),
      });
    }
    if (path[0] === "threads" && path.length === 3 && path[2] === "configurations") {
      return Response.json(await conversationConfigurations(thread(owner, path[1])));
    }
    if (path[0] === "threads" && path.length === 2) {
      const item = thread(owner, path[1]);
      const result = await history(item);
      return Response.json({
        thread: { ...item, owner: undefined },
        ...result,
      });
    }
    throw new HttpError(404, "接口不存在");
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const { path } = await context.params;
    if (path[0] === "threads" && path.length === 3 && path[2] === "recover") {
      return Response.json(
        await recoverRequest(thread(await visitor(), path[1])),
      );
    }
    if (path[0] !== "threads" || path.length !== 1)
      throw new HttpError(404, "接口不存在");
    const parsed = z
      .object({ demo: z.string(), persona: z.string(), month: z.string() })
      .strict()
      .safeParse(await request.json());
    if (
      !parsed.success ||
      !findDemo(parsed.data.demo) ||
      !validDemoContext(
        parsed.data.demo,
        parsed.data.persona,
        parsed.data.month,
      )
    )
      throw new HttpError(400, "请选择有效的 Demo、模拟用户和示例月份");
    const owner = await visitor();
    const demo = findDemo(parsed.data.demo)!;
    if (threads(owner, demo.slug).length >= 100)
      throw new HttpError(429, "会话数量已达上限，请删除不需要的会话");
    const item = createThread(
      owner,
      demo.slug,
      parsed.data.persona,
      parsed.data.month,
    );
    return Response.json({ ...item, owner: undefined }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const { path } = await context.params;
    if (path[0] !== "threads" || path.length !== 2)
      throw new HttpError(404, "接口不存在");
    const item = thread(await visitor(), path[1]);
    if (pending(item.id))
      throw new HttpError(409, "会话仍有未确认的执行，请先刷新状态");
    if (item.upstream_id)
      await agentRequest(
        `/v1/agent/conversations/${item.upstream_id}?${new URLSearchParams({ userId: platformUser(item) })}`,
        { method: "DELETE" },
        item.demo,
      );
    removeThread(item.id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return fail(error);
  }
}
