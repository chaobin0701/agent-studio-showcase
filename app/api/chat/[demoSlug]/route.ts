import { z } from "zod";
import { findDemo } from "@/lib/catalog";
import { sendMessage } from "@/lib/server/agent-studio";
import { submitUi } from "@/lib/server/ui-submissions";
import { uiSubmissionSchema } from "@/lib/generative-ui/actions";
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
    const base = {
        threadId: z.uuid(),
        requestId: z.uuid(),
    };
    const parsed = z.union([z.strictObject({
        ...base,
        message: z.string().trim().min(2).max(1600),
      }), z.strictObject({ ...base, uiSubmission: uiSubmissionSchema })])
      .safeParse(await request.json());
    if (!parsed.success)
      throw new HttpError(
        400,
        "消息需要 2–1600 个字符，并包含有效的会话和请求标识",
      );
    const item = thread(await visitor(), parsed.data.threadId, demoSlug);
    if ("uiSubmission" in parsed.data) return await submitUi(item, parsed.data.uiSubmission, parsed.data.requestId);
    return await sendMessage(item, parsed.data.message, parsed.data.requestId);
  } catch (error) {
    return fail(error);
  }
}
