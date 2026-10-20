import { z } from "zod";
import { findDemo } from "@/lib/catalog";
import { interactionCancellationSchema } from "@/lib/interactions";
import { cancelInteraction } from "@/lib/server/agent-studio";
import { thread } from "@/lib/server/store";
import { fail, HttpError, sameOrigin, visitor } from "@/lib/server/security";

export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ demoSlug: string; interactionId: string }> },
) {
  try {
    sameOrigin(request);
    const { demoSlug, interactionId } = await context.params;
    if (!findDemo(demoSlug)) throw new HttpError(404, "Demo 不存在");
    const parsed = interactionCancellationSchema.safeParse(
      await request.json(),
    );
    if (!z.uuid().safeParse(interactionId).success || !parsed.success)
      throw new HttpError(400, "请提供有效的交互请求");
    const owned = thread(await visitor(), parsed.data.threadId, demoSlug);
    return Response.json(await cancelInteraction(owned, interactionId));
  } catch (error) {
    return fail(error);
  }
}
