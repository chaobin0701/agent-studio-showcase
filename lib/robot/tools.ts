import { z } from "zod";
import {
  dataSource,
  getProfile,
  getRecord,
  months,
  profiles,
  weatherSample,
} from "./service";

const user = z
  .string()
  .regex(/^10(?:0[1-9]|10)$/)
  .describe("页面选择的公开模拟用户 ID（1001 至 1010），不得随机选择");
const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .describe("YYYY-MM；示例记录仅有 2025-01 至 2025-12");
export const toolDefinitions = {
  list_demo_users: {
    description: "列出公开模拟用户、家庭特征与可用月份。所有数据均为演示数据。",
    schema: z.object({}).strict(),
    run: () => ({ profiles, availableMonths: months, dataSource }),
  },
  get_user_id: {
    description:
      "校验页面选定的模拟用户并返回稳定的身份。不是实际登录用户查询，不随机生成。",
    schema: z.object({ user_id: user }).strict(),
    run: (input: { user_id: string }) => {
      const p = getProfile(input.user_id);
      return p
        ? { user_id: p.id, name: p.name, simulated: true }
        : { found: false };
    },
  },
  get_user_location: {
    description: "查询指定模拟用户的固定城市，配合 get_weather 使用。",
    schema: z.object({ user_id: user }).strict(),
    run: (input: { user_id: string }) => ({
      user_id: input.user_id,
      city: getProfile(input.user_id)?.city,
      simulated: true,
    }),
  },
  get_current_month: {
    description:
      "获取中国时区的真实当前月份以及示例记录可用月份。当前月份可能没有模拟记录；不能把 2025 的记录称为当前数据。",
    schema: z.object({}).strict(),
    run: () => ({
      currentMonth: new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
      }).format(new Date()),
      availableMonths: months,
      dataSource,
    }),
  },
  get_weather: {
    description:
      "获取深圳、合肥或杭州的固定天气样本，明确为模拟天气，非实时天气。",
    schema: z.object({ city: z.enum(["深圳", "合肥", "杭州"]) }).strict(),
    run: (input: { city: string }) => weatherSample(input.city),
  },
  fetch_external_data: {
    description:
      "读取指定模拟用户在指定月份的扫拖机器人使用记录，包含特征、效率、耗材与对比。不存在时返回 found=false，不编造记录。",
    schema: z.object({ user_id: user, month }).strict(),
    run: (input: { user_id: string; month: string }) => ({
      found: Boolean(getRecord(input.user_id, input.month)),
      record: getRecord(input.user_id, input.month),
      dataSource,
    }),
  },
  fill_context_for_report: {
    description:
      "读取报告栏目约定与数据边界。只返回指导，不切换平台提示词或修改运行状态。",
    schema: z.object({}).strict(),
    run: () => ({
      title: "扫地机器人使用情况报告与保养建议",
      sections: [
        "家庭与月份",
        "清洁效率",
        "耗材状态",
        "对比观察",
        "三项保养建议",
      ],
      rules: [
        "先获取选定用户和月份的记录",
        "只引用工具返回的数据，不编造数值",
        "说明样本属于模拟记录，不能诊断真实设备",
        "无记录时说明缺失并提示可选月份",
      ],
      dataSource,
    }),
  },
} as const;
export type ToolName = keyof typeof toolDefinitions;
export function executeTool(name: string, input: unknown) {
  if (!Object.hasOwn(toolDefinitions, name)) throw new Error("unknown_tool");
  const definition = toolDefinitions[name as ToolName];
  const parsed = definition.schema.parse(input);
  return (definition.run as (input: unknown) => unknown)(parsed);
}
