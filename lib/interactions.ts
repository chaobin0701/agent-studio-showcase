import { z } from "zod";

export type ChatInteraction = {
  id: string;
  runId: string;
  kind: "question" | "approval";
  status:
    "pending" | "answered" | "skipped" | "approved" | "rejected" | "expired" | "cancelled";
  revision: number;
  expiresAt: string;
  question?: string;
  options?: { id: string; label: string }[];
  allowCustom?: boolean;
  toolName?: string;
  description?: string;
  /** Redacted by Agent Studio; confirmation cards do not render these arguments. */
  arguments?: Record<string, unknown>;
  answer?: { optionId?: string; text?: string; skipped?: true };
};

export const interactionResponseSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("question"),
      interactionId: z.uuid(),
      revision: z.number().int().positive(),
      optionId: z.string().min(1).max(80).optional(),
      text: z.string().trim().min(1).max(4000).optional(),
      skip: z.literal(true).optional(),
    })
    .strict()
    .refine(
      (value) => [value.optionId, value.text, value.skip].filter(Boolean).length === 1,
      "请选择一个选项、填写回答或跳过",
    ),
  z
    .object({
      kind: z.literal("approval"),
      interactionId: z.uuid(),
      revision: z.number().int().positive(),
      decision: z.enum(["approve", "reject"]),
    })
    .strict(),
]);
export type ChatInteractionResponse = z.infer<typeof interactionResponseSchema>;
export const interactionSubmissionSchema = z
  .object({
    threadId: z.uuid(),
    response: interactionResponseSchema,
  })
  .strict();
export const interactionCancellationSchema = z
  .object({ threadId: z.uuid() })
  .strict();
