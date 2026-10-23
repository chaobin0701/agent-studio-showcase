import { z } from "zod";

const blockSchema = z.object({
  protocolVersion: z.number().int(), runId: z.string().min(1).max(200), blockId: z.string().min(1).max(500), toolCallId: z.string().max(200),
  adapter: z.string().max(100), catalogVersion: z.string().max(100), revision: z.number().int().positive(), status: z.literal("completed"),
  tree: z.unknown(), fallbackText: z.string().max(4000),
});
export type UiBlock = z.infer<typeof blockSchema>;
export function readUiBlock(value: unknown): UiBlock | null {
  if (JSON.stringify(value)?.length > 12000) return null;
  const parsed = blockSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
export function upsertUiBlock(blocks: UiBlock[] = [], value: unknown): UiBlock[] {
  const block = readUiBlock(value);
  if (!block) return blocks;
  const index = blocks.findIndex(old => old.blockId === block.blockId);
  if (index < 0) return blocks.length < 50 ? [...blocks, block] : blocks;
  if (blocks[index].runId !== block.runId || blocks[index].revision >= block.revision) return blocks;
  return blocks.map((old, i) => i === index ? block : old);
}
export function readUiBlocks(value: unknown): UiBlock[] {
  return Array.isArray(value) ? value.slice(0, 50).reduce<UiBlock[]>((blocks, block) => upsertUiBlock(blocks, block), []) : [];
}
