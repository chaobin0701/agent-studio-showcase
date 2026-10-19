import { z } from "zod";
import { findDemo } from "@/lib/catalog";
import { sendMessage } from "@/lib/server/agent-studio";
import { thread } from "@/lib/server/store";
import { fail, HttpError, sameOrigin, visitor } from "@/lib/server/security";
export const runtime = "nodejs";
export const maxDuration = 180;
export async function POST(
  request: Request,
  context: { params: Promise<{ demoSlug: string }> },
) {
  try {
    sameOrigin(request);
    const { demoSlug } = await context.params;
    if (!findDemo(demoSlug)) throw new HttpError(404, "Demo 不存在");
    const parsed = z
      .object({
        threadId: z.uuid(),
        requestId: z.uuid(),
        message: z.string().trim().min(2).max(1600),
      })
      .strict()
      .safeParse(await request.json());
    if (!parsed.success)
      throw new HttpError(
        400,
        "消息需要 2–1600 个字符，并包含有效的会话和请求标识",
      );
    const item = thread(await visitor(), parsed.data.threadId, demoSlug);
    return await sendMessage(item, parsed.data.message, parsed.data.requestId);
  } catch (error) {
    return fail(error);
  }
}
