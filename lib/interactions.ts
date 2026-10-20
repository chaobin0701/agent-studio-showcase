import { z } from "zod";

export type ChatInteraction = {
  id: string;
  runId: string;
  kind: "question" | "approval";
  status:
    "pending" | "answered" | "approved" | "rejected" | "expired" | "cancelled";
  revision: number;
  expiresAt: string;
  question?: string;
  options?: { id: string; label: string }[];
  allowCustom?: boolean;
  toolName?: string;
  description?: string;
  /** Redacted by Agent Studio; displayed as text, never sent back as authority. */
  arguments?: Record<string, unknown>;
  answer?: { optionId?: string; text?: string };
};

export const interactionResponseSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("question"),
      interactionId: z.uuid(),
      revision: z.number().int().positive(),
      optionId: z.string().min(1).max(80).optional(),
      text: z.string().trim().min(1).max(4000).optional(),
    })
    .strict()
    .refine(
      (value) => Boolean(value.optionId) !== Boolean(value.text),
      "请选择一个选项或填写回答",
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
