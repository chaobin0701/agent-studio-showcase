import { z } from "zod";

const text = z.string().max(500);
const cell = z.union([text, z.number().finite()]);
const chartValue = z.number().finite().min(-1_000_000_000_000).max(1_000_000_000_000);
// One source of truth for renderer props and the published present catalog.
export const definitions = {
  Card: { description: "摘要卡片，可包含标题、说明和子组件。", children: true, properties: z.strictObject({ title: text, description: text.optional() }) },
  Row: { description: "横向排列子组件，小屏幕自动换行。", children: true, properties: z.strictObject({}) },
  Fact: { description: "单个指标：名称、值和可选说明。", children: false, properties: z.strictObject({ label: text, value: cell, detail: text.optional() }) },
  Chart: { description: "展示一组有序数据的柱状图或折线图。数值必须来自真实查询结果，不得编造。", children: false, properties: z.strictObject({ title: text, chartType: z.enum(["bar", "line"]), points: z.array(z.strictObject({ label: text, value: chartValue })).min(1).max(30), unit: z.string().max(30).optional() }) },
  Table: { description: "只读数据表。每行单元格按 columns 顺序提供。", children: false, properties: z.strictObject({ caption: text, columns: z.array(z.string().max(100)).min(1).max(8), rows: z.array(z.array(cell).max(8)).max(30) }) },
};
export type ComponentName = keyof typeof definitions;

/** Validate the complete tree before assistant-ui renders it, including history. */
export function validTree(tree: unknown): boolean {
  if (JSON.stringify(tree)?.length > 6000) return false;
  let nodes = 0;
  function visit(value: unknown, depth: number): boolean {
    if (typeof value === "string") return value.length <= 500;
    if (++nodes > 80 || depth > 8 || !value || typeof value !== "object" || Array.isArray(value)) return false;
    const { _type, _key, children, ...props } = value as Record<string, unknown>;
    if (typeof _type !== "string" || !Object.hasOwn(definitions, _type) || (_key !== undefined && !(typeof _key === "string" && _key.length <= 100) && !(typeof _key === "number" && Number.isFinite(_key)))) return false;
    const definition = definitions[_type as ComponentName];
    if (!definition.properties.safeParse(props).success) return false;
    return children === undefined || (definition.children && (Array.isArray(children)
      ? children.length <= 40 && children.every(child => visit(child, depth + 1))
      : visit(children, depth + 1)));
  }
  return !!tree && typeof tree === "object" && !Array.isArray(tree) && visit(tree, 0);
}
