import { history, sendMessage } from "./agent-studio";
import { pending, savedRequest, type Thread } from "./store";
import { HttpError } from "./security";
import { uiSubmissionSchema, submissionMessage, type UiSubmission } from "../generative-ui/actions";
import { readUiBlocks } from "../generative-ui/blocks";
import { supportedBlock } from "../generative-ui/catalogs";

/** The caller must resolve the thread with visitor ownership and Demo scope first. */
export async function submitUi(thread: Thread, input: UiSubmission, requestId: string) {
  const parsed = uiSubmissionSchema.safeParse(input);
  if (!parsed.success) throw new HttpError(400, "无效的界面提交");
  const saved = savedRequest(requestId);
  if (saved && saved.thread_id !== thread.id) throw new HttpError(409, "请求标识已用于其他会话");
  const snapshot = await history(thread);
  if (pending(thread.id) && !saved) throw new HttpError(409, "请先完成或恢复当前会话");
  const block = snapshot.messages.flatMap((message: { role: string; status?: string; refused?: boolean; incomplete?: boolean; uiBlocks?: unknown }) =>
    message.role === "assistant" && (!message.status || message.status === "completed") && !message.refused && !message.incomplete
      ? readUiBlocks(message.uiBlocks) : [],
  ).find((item: { blockId: string; revision: number }) => item.blockId === input.blockId && item.revision === input.revision);
  if (!block || !supportedBlock(block)) throw new HttpError(409, "界面已变化或不存在，请刷新会话");
  let message: string;
  try { message = submissionMessage(block, parsed.data); }
  catch { throw new HttpError(400, "提交内容与界面不匹配，请检查填写内容或刷新后重试"); }
  return sendMessage(thread, message, requestId, parsed.data);
}
