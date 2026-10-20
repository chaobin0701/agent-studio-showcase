import { z } from "zod";
import { findDemo } from "@/lib/catalog";
import { interactionSubmissionSchema } from "@/lib/interactions";
import { respondToInteraction } from "@/lib/server/agent-studio";
import { thread } from "@/lib/server/store";
import { fail, HttpError, sameOrigin, visitor } from "@/lib/server/security";

export const runtime = "nodejs";
export const maxDuration = 180;
export async function POST(
  request: Request,
  context: { params: Promise<{ demoSlug: string; interactionId: string }> },
) {
  try {
    sameOrigin(request);
    const { demoSlug, interactionId } = await context.params;
    if (!findDemo(demoSlug)) throw new HttpError(404, "Demo 不存在");
    const parsed = interactionSubmissionSchema.safeParse(await request.json());
    if (
      !z.uuid().safeParse(interactionId).success ||
      !parsed.success ||
      parsed.data.response.interactionId !== interactionId
    )
      throw new HttpError(400, "请提供有效的交互请求和答复");
    const owned = thread(await visitor(), parsed.data.threadId, demoSlug);
    return await respondToInteraction(owned, parsed.data.response);
  } catch (error) {
    return fail(error);
  }
}
