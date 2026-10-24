import { z } from "zod";
import { definitions, validTree } from "./definitions";
import type { UiBlock } from "./blocks";

export const uiSubmissionSchema = z.strictObject({
  blockId: z.string().min(1).max(500), revision: z.number().int().positive(),
  componentId: z.string().min(1).max(64),
  values: z.record(z.string().max(64), z.union([z.string().max(1000), z.number().finite(), z.boolean(), z.array(z.string().max(64)).max(12)])).optional(),
  decision: z.enum(["confirm", "cancel"]).optional(),
});
export type UiSubmission = z.infer<typeof uiSubmissionSchema>;
export type UiReceipt = UiSubmission & { state: string };
export const receiptKey = (value: Pick<UiSubmission, "blockId" | "revision" | "componentId">) =>
  JSON.stringify([value.blockId, value.revision, value.componentId]);

function findNode(tree: unknown, id: string): Record<string, unknown> | undefined {
  if (!tree || typeof tree !== "object" || Array.isArray(tree)) return;
  const node = tree as Record<string, unknown>;
  if (node.id === id) return node;
  for (const child of Array.isArray(node.children) ? node.children : [node.children]) {
    const found = findNode(child, id);
    if (found) return found;
  }
}
function invalid(): never { throw new Error("提交内容与界面不匹配，请刷新后重试"); }

/** Resolve only against an owned conversation's persisted, validated UI tree. */
export function submissionMessage(block: UiBlock, input: UiSubmission): string {
  if (block.blockId !== input.blockId || block.revision !== input.revision || !validTree(block.tree)) return invalid();
  const node = findNode(block.tree, input.componentId);
  if (!node) return invalid();
  const values = input.values ?? {};
  let message: string;
  switch (node._type) {
    case "ActionButton": {
      const props = definitions.ActionButton.properties.parse(nodeProps(node));
      if (props.action.type !== "send_message" || Object.keys(values).length || input.decision) return invalid();
      message = props.action.message;
      break;
    }
    case "Choice": {
      const props = definitions.Choice.properties.parse(nodeProps(node));
      const selected = values.selection;
      if (input.decision || Object.keys(values).some(key => key !== "selection") || !Array.isArray(selected)
        || !selected.length || (!props.multiple && selected.length !== 1) || new Set(selected).size !== selected.length
        || selected.some(value => !props.options.some(option => option.value === value))) return invalid();
      message = `${props.title}\n我的选择：${props.options.filter(option => selected.includes(option.value)).map(option => option.label).join("、")}`;
      break;
    }
    case "Form": {
      const props = definitions.Form.properties.parse(nodeProps(node));
      if (input.decision || Object.keys(values).some(key => !props.fields.some(field => field.name === key))) return invalid();
      const lines = props.fields.map(field => {
        const value = values[field.name];
        const empty = value === undefined || value === "" || (typeof value === "string" && !value.trim());
        if (empty) {
          if (field.required) return invalid();
          return `${field.label}：未填写`;
        }
        if (field.type === "checkbox") {
          if (typeof value !== "boolean" || (field.required && !value)) return invalid();
          return `${field.label}：${value ? "是" : "否"}`;
        }
        if (field.type === "number") {
          if (typeof value !== "number" || !Number.isFinite(value)) return invalid();
        } else if (typeof value !== "string") return invalid();
        if (field.type === "select") {
          const option = field.options?.find(option => option.value === value);
          if (!option) return invalid();
          return `${field.label}：${option.label}`;
        }
        if (field.type === "date" && !z.iso.date().safeParse(value).success) return invalid();
        return `${field.label}：${value}`;
      });
      message = `${props.title}\n${lines.join("\n")}`;
      break;
    }
    case "Confirmation": {
      const props = definitions.Confirmation.properties.parse(nodeProps(node));
      if (Object.keys(values).length || !input.decision) return invalid();
      message = `${input.decision === "confirm" ? "我确认" : "我取消"}：${props.message}`;
      break;
    }
    default: return invalid();
  }
  if (message.length < 2 || message.length > 1600) throw new Error("提交内容最多 1600 字，请缩短后重试");
  return message;
}
function nodeProps(node: Record<string, unknown>) {
  const { _type, _key, children, ...props } = node;
  return props;
}
