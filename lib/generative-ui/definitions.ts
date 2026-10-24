import { z } from "zod";

const text = z.string().max(500);
const cell = z.union([text, z.number().finite()]);
const chartValue = z.number().finite().min(-1_000_000_000_000).max(1_000_000_000_000);
export const safeUrlSchema = z.string().max(2000).regex(/^(?:https:\/\/[a-zA-Z0-9.-]+(?::[0-9]{1,5})?(?:[/?#][^\s\\]*)?|\/(?!\/)[^\s\\]*)$/);
export function safeUrl(value: string): string | undefined {
  return safeUrlSchema.safeParse(value).success ? value : undefined;
}
const id = z.string().min(1).max(64).regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/);
const tone = z.enum(["neutral", "info", "success", "warning", "danger"]);
const option = z.strictObject({ value: id, label: text });
const options = z.array(option).min(1).max(12);
const article = z.strictObject({ title: text, content: z.string().max(3000) });
const image = z.strictObject({ src: safeUrlSchema, alt: z.string().min(1).max(500), caption: text.optional(), sourceUrl: safeUrlSchema.optional() });
const action = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("send_message"), message: z.string().trim().min(2).max(1200) }),
  z.strictObject({ type: z.literal("open_url"), url: safeUrlSchema }),
]);
const formFieldBase = z.strictObject({
  name: id, label: text, required: z.boolean().optional(), placeholder: text.optional(),
});
export const formFieldSchema = z.discriminatedUnion("type", [
  formFieldBase.extend({ type: z.literal("select"), options }),
  formFieldBase.extend({ type: z.enum(["text", "textarea", "number", "date", "checkbox"]), options: z.never().optional() }),
]);
// One source of truth for renderer props and the published present catalog.
export const definitions = {
  Card: { description: "摘要卡片，可包含标题、说明和子组件。", children: true, properties: z.strictObject({ title: text, description: text.optional() }) },
  Row: { description: "横向排列子组件，小屏幕自动换行。", children: true, properties: z.strictObject({}) },
  Fact: { description: "单个指标：名称、值和可选说明。", children: false, properties: z.strictObject({ label: text, value: cell, detail: text.optional() }) },
  Chart: { description: "展示柱状图或折线图；数据来自查询结果或用户明确提供的示例，不得编造。", children: false, properties: z.strictObject({ title: text, chartType: z.enum(["bar", "line"]), points: z.array(z.strictObject({ label: text, value: chartValue })).min(1).max(30), unit: z.string().max(30).optional() }) },
  Table: { description: "只读数据表。每行单元格按 columns 顺序提供。", children: false, properties: z.strictObject({ caption: text, columns: z.array(z.string().max(100)).min(1).max(8), rows: z.array(z.array(cell).max(8)).max(30) }) },
  Markdown: { description: "段落、列表、代码和链接，不支持原始 HTML。", children: false, properties: z.strictObject({ content: z.string().max(4000) }) },
  Alert: { description: "提示、成功、警告或错误信息。", children: false, properties: z.strictObject({ title: text, description: text.optional(), tone: tone.optional() }) },
  Image: { description: "已知来源图片，必须提供替代文本，不得编造 URL。", children: false, properties: image },
  Gallery: { description: "已知来源的多图集合。", children: false, properties: z.strictObject({ title: text, images: z.array(image).min(1).max(8) }) },
  Badge: { description: "简短的状态标记。", children: false, properties: z.strictObject({ label: text, tone: tone.optional() }) },
  Tag: { description: "简短分类标签。", children: false, properties: z.strictObject({ label: text, tone: tone.optional() }) },
  KeyValue: { description: "属性摘要，每项为 label/value，可用文字或数字。", children: false, properties: z.strictObject({ title: text.optional(), entries: z.array(z.strictObject({ label: text, value: cell })).min(1).max(20) }) },
  Steps: { description: "只读操作步骤；state 是 pending/current/completed。", children: false, properties: z.strictObject({ title: text, steps: z.array(z.strictObject({ title: text, description: text.optional(), state: z.enum(["pending", "current", "completed"]).optional() })).min(1).max(12) }) },
  Timeline: { description: "按顺序展示事件、时间和说明。", children: false, properties: z.strictObject({ title: text, events: z.array(z.strictObject({ title: text, time: text.optional(), description: text.optional() })).min(1).max(20) }) },
  Accordion: { description: "折叠长说明，sections 中的 content 支持 Markdown。", children: false, properties: z.strictObject({ title: text, sections: z.array(article).min(1).max(12) }) },
  Tabs: { description: "切换内容视角；tabs 中的 content 支持 Markdown。", children: false, properties: z.strictObject({ title: text, tabs: z.array(article).min(1).max(8) }) },
  List: { description: "搜索结果、推荐项或文档列表，可附安全链接。", children: false, properties: z.strictObject({ title: text, items: z.array(z.strictObject({ title: text, description: text.optional(), url: safeUrlSchema.optional() })).min(1).max(20) }) },
  Choice: { description: "单选或多选后发送下一轮消息。id 在整棵树内必须唯一，options 的 value 不重复。", children: false, properties: z.strictObject({ id, title: text, multiple: z.boolean().optional(), options, submitLabel: text.optional() }) },
  ActionButton: { description: "仅支持 send_message 或 open_url；不直接执行工具。id 在树内唯一。", children: false, properties: z.strictObject({ id, label: text, action }) },
  Form: { description: "收集非敏感信息并作为下一轮消息提交。id 唯一，fields 的 name 唯一；select 必须提供 options，其他字段不要提供 options。不收集密码或凭证。", children: false, properties: z.strictObject({ id, title: text, description: text.optional(), fields: z.array(formFieldSchema).min(1).max(10), submitLabel: text.optional() }) },
  Confirmation: { description: "确认或取消一段用户意图，结果发送为下一轮消息；不是工具审批，不能替代平台授权。id 在树内唯一。", children: false, properties: z.strictObject({ id, title: text, description: text, message: z.string().trim().min(2).max(1200), confirmLabel: text.optional(), cancelLabel: text.optional() }) },
};
export type ComponentName = keyof typeof definitions;

/** Validate the complete tree before assistant-ui renders it, including history. */
export function validTree(tree: unknown): boolean {
  try { if (JSON.stringify(tree)?.length > 6000) return false; } catch { return false; }
  let nodes = 0;
  const ids = new Set<string>();
  function visit(value: unknown, depth: number): boolean {
    if (typeof value === "string") return value.length <= 500;
    if (++nodes > 80 || depth > 8 || !value || typeof value !== "object" || Array.isArray(value)) return false;
    const { _type, _key, children, ...props } = value as Record<string, unknown>;
    if (typeof _type !== "string" || !Object.hasOwn(definitions, _type) || (_key !== undefined && !(typeof _key === "string" && _key.length <= 100) && !(typeof _key === "number" && Number.isFinite(_key)))) return false;
    const definition = definitions[_type as ComponentName];
    if (!definition.properties.safeParse(props).success) return false;
    if (["Choice", "ActionButton", "Form", "Confirmation"].includes(_type)) {
      if (ids.has(props.id as string)) return false;
      ids.add(props.id as string);
    }
    const unique = (values: unknown[]) => new Set(values).size === values.length;
    if (_type === "Choice" && !unique((props.options as z.infer<typeof option>[]).map(item => item.value))) return false;
    if (_type === "Form") {
      const fields = props.fields as z.infer<typeof formFieldSchema>[];
      if (!unique(fields.map(field => field.name)) || fields.some(field => field.type === "select"
        ? !field.options || !unique(field.options.map(item => item.value))
        : field.options !== undefined)) return false;
    }
    return children === undefined || (definition.children && (Array.isArray(children)
      ? children.length <= 40 && children.every(child => visit(child, depth + 1))
      : visit(children, depth + 1)));
  }
  return !!tree && typeof tree === "object" && !Array.isArray(tree) && visit(tree, 0);
}
