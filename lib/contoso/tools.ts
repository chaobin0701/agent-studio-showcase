import { z } from "zod";
import {
  categories,
  contosoSource,
  customerOrders,
  customerProfile,
  getProduct,
  searchProducts,
  productSummary,
} from "./service";
import { contosoProfiles } from "./localization";

const customerId = z
  .string()
  .regex(/^(?:[1-9]|1[0-2])$/)
  .describe("页面指定的公开模拟客户 ID，1 至 12；不得随机选择。不是登录账号。");
const productId = z
  .string()
  .regex(/^(?:[1-9]|1[0-9]|20)$/)
  .describe("商品目录中的稳定 ID，1 至 20。");
export const contosoToolDefinitions = {
  contoso_search_products: {
    description:
      "查询 Contoso 中文模拟商品。支持中文名称、英文别名和中英文商品类型；按人民币 CNY 模拟价格、分类和帐篷人数进行确定性筛选。预算与人数应使用结构化参数，不从描述猜测；空 query 列出符合筛选的目录。",
    schema: z
      .object({
        query: z.string().max(160).optional().describe("中文商品名、英文别名或类别词；仅按预算和人数筛选时可留空。"),
        category: z.enum(categories).optional(),
        max_price: z.coerce.number().finite().min(0).max(100000).optional().describe("人民币模拟价格上限，单位：元（CNY）。"),
        min_capacity: z.coerce.number().int().min(1).max(20).optional().describe("帐篷至少可容纳的人数。"),
        limit: z.coerce.number().int().min(1).max(20).optional(),
      })
      .strict(),
    run: searchProducts,
  },
  contoso_get_product: {
    description:
      "按商品 ID 获取人民币模拟价格、中文描述、完整规格和可访问的中文商品说明页。未知规格不编造；使用和保养步骤需要检索知识库说明书。",
    schema: z.object({ product_id: productId }).strict(),
    run: ({ product_id }: { product_id: string }) => ({
      product: getProduct(product_id),
      dataSource: contosoSource,
    }),
  },
  contoso_compare_products: {
    description:
      "比较 2 至 4 个不同商品。返回中文名称、人民币模拟价格与完整中文规格，缺失属性保留未知；不生成比较结论。",
    schema: z
      .object({
        product_ids: z
          .string()
          .regex(/^\d{1,2}(,\d{1,2}){1,3}$/)
          .refine(
            (s) =>
              new Set(s.split(",")).size === s.split(",").length &&
              s.split(",").every((id) => Boolean(getProduct(id))),
            "请选择 2 至 4 个不同的有效商品 ID",
          ),
      })
      .strict(),
    run: ({ product_ids }: { product_ids: string }) => ({
      products: product_ids.split(",").map((id) => {
        const p = getProduct(id)!;
        return { ...productSummary(p), specs: p.specs };
      }),
      dataSource: contosoSource,
    }),
  },
  contoso_list_customers: {
    description:
      "列出可在页面选择的 12 位中文名称虚构客户。仅用于演示背景，不是实际个人身份。",
    schema: z.object({}).strict(),
    run: () => ({ customers: contosoProfiles, dataSource: contosoSource }),
  },
  contoso_get_customer: {
    description:
      "查询页面指定的模拟客户中文姓名和中文会员标签；没有真实会员权益和折扣规则，不据此承诺折扣。",
    schema: z.object({ customer_id: customerId }).strict(),
    run: ({ customer_id }: { customer_id: string }) => ({
      customer: customerProfile(customer_id),
      dataSource: contosoSource,
    }),
  },
  contoso_get_orders: {
    description:
      "读取指定虚构客户的完整 2023 年模拟购买记录，按日期从新到旧排序；商品使用中文名，单价与总额按人民币模拟定价重算，summary.totalAmount 为总金额、currency 为 CNY。没有物流、库存、退换货状态。",
    schema: z.object({ customer_id: customerId }).strict(),
    run: ({ customer_id }: { customer_id: string }) => {
      const orders = customerOrders(customer_id)!;
      return {
        customer: customerProfile(customer_id),
        orders,
        summary: {
          orderCount: orders.length,
          itemQuantity: orders.reduce((sum, o) => sum + o.quantity, 0),
          totalAmount: orders.reduce((sum, o) => sum + o.total, 0),
          currency: "CNY",
          distinctProducts: new Set(orders.map((o) => o.productId)).size,
        },
        dataSource: contosoSource,
      };
    },
  },
} as const;
export type ContosoToolName = keyof typeof contosoToolDefinitions;
export function executeContosoTool(name: string, input: unknown) {
  if (!Object.hasOwn(contosoToolDefinitions, name))
    throw new Error("unknown_tool");
  const definition = contosoToolDefinitions[name as ContosoToolName];
  return (definition.run as (data: unknown) => unknown)(
    definition.schema.parse(input),
  );
}
