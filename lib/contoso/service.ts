import catalog from "../../data/contoso/products.json";
import customerData from "../../data/contoso/customers.json";
import chineseCatalog from "../../data/contoso/zh-CN/catalog.json";
import { contosoDatasetVersion, contosoProfiles, membershipNames, formatCny } from "./localization";

type LocalizedProduct = {
  name: string;
  brand: string;
  price: number;
  description: string;
  specs: Record<string, string>;
};
const localizedCatalog: Record<string, LocalizedProduct> = chineseCatalog;

export const contosoSource = {
  simulated: true,
  label: "Contoso Outdoor 中文模拟资料",
  datasetVersion: contosoDatasetVersion,
  locale: "zh-CN",
  currency: "CNY",
  orderYear: "2023",
  note: "人民币模拟价格为独立演示定价；2023 年模拟购买记录按该价格重算，不代表真实订单、库存或物流。",
  repository: "https://github.com/Azure-Samples/contoso-chat",
  commit: "028921fe3209db3216075d34ced6c109de132533",
} as const;
export const categories = [
  "Tents",
  "Backpacks",
  "Camping Stoves",
  "Camping Tables",
  "Hiking Clothing",
  "Hiking Footwear",
  "Sleeping Bags",
] as const;
export const categoryNames: Record<string, string> = {
  Tents: "帐篷",
  Backpacks: "背包",
  "Camping Stoves": "露营炉具",
  "Camping Tables": "露营桌椅",
  "Hiking Clothing": "徒步服装",
  "Hiking Footwear": "徒步鞋履",
  "Sleeping Bags": "睡袋",
};
export const products = catalog.map((p) => ({
  ...p,
  ...localizedCatalog[p.id],
  specs: {
    ...localizedCatalog[p.id].specs,
    ...(Object.hasOwn(localizedCatalog[p.id].specs, "价格")
      ? { "价格": `${formatCny(localizedCatalog[p.id].price)}（人民币模拟价格）` }
      : {}),
  } as Record<string, string>,
  currency: "CNY" as const,
  categoryName: categoryNames[p.category],
  href: `/demos/contoso-outdoor/products/${p.id}`,
  manualTitle: `${localizedCatalog[p.id].name} · 使用说明书`,
}));
export const customers = customerData.map((customer) => ({
  ...customer,
  name: contosoProfiles.find((p) => p.customerId === customer.id)!.name,
  orders: customer.orders.map((order) => {
    const price = products.find((p) => p.id === order.productId)!.price;
    return { ...order, currency: "CNY" as const, unitPrice: price, total: order.quantity * price };
  }),
}));
export function getProduct(id: string) {
  return products.find((p) => p.id === id) ?? null;
}
export function getCustomer(id: string) {
  return customers.find((c) => c.id === id) ?? null;
}
export function customerProfile(id: string) {
  const c = getCustomer(id);
  return c
    ? {
        id: c.id,
        name: c.name,
        membership: c.membership,
        membershipName: c.membership ? membershipNames[c.membership] ?? "未提供" : "未提供",
        orderCount: c.orders.length,
        membershipNote: "仅为样例会员标签，没有可据此推断的折扣或权益。",
      }
    : null;
}
export function customerOrders(id: string) {
  return (
    getCustomer(id)?.orders.map((o) => ({
      ...o,
      product: productSummary(getProduct(o.productId)!),
    })) ?? null
  );
}
export function productSummary(p: (typeof products)[number]) {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    currency: p.currency,
    category: p.category,
    categoryName: p.categoryName,
    capacityPeople: p.capacityPeople,
    href: p.href,
    manualTitle: p.manualTitle,
  };
}
export function knowledgeManual(name: string, id: string, original: string) {
  // The source's generic top heading loses product identity on split chunks.
  // Preserve the raw manual separately; give every knowledge heading its product.
  return `# ${name}（商品 ID ${id}）\n\n${original.replace(/^# [^\n]+\n/, "").trimStart()}`;
}
const synonyms: [RegExp, string[]][] = [
  [/帐篷|露营帐|tent/i, ["tent"]],
  [/背包|双肩包|backpack|daypack/i, ["backpack", "daypack"]],
  [/炉具|炉子|炉头|stove/i, ["stove"]],
  [/桌|table/i, ["table"]],
  [/椅|chair/i, ["chair"]],
  [/睡袋|sleeping/i, ["sleeping"]],
  [/冲锋衣|夹克|外套|jacket/i, ["jacket"]],
  [/裤|pants/i, ["pants"]],
  [/鞋|boots|shoes|sandals/i, ["boots", "shoes", "sandals"]],
];
export type SearchInput = {
  query?: string;
  category?: string;
  max_price?: number;
  min_capacity?: number;
  limit?: number;
};
export function searchProducts(input: SearchInput) {
  const query = (input.query ?? "").trim();
  const normalized = query.toLowerCase();
  // An explicitly named item takes precedence over generic category synonyms.
  const namedProducts = catalog.filter((p) =>
    [p.name, localizedCatalog[p.id].name].some((name) =>
      normalized.includes(name.toLowerCase()),
    ),
  );
  const terms = query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const expanded = synonyms
    .filter(([pattern]) => pattern.test(query))
    .flatMap(([, words]) => words);
  const searchTerms = [...new Set([...terms, ...expanded])];
  const matched = products
    .filter((p) => {
      if (input.category && p.category !== input.category) return false;
      if (input.max_price !== undefined && p.price > input.max_price)
        return false;
      if (
        input.min_capacity !== undefined &&
        (p.capacityPeople === null || p.capacityPeople < input.min_capacity)
      )
        return false;
      if (!query) return true;
      if (namedProducts.length)
        return namedProducts.some((named) => named.id === p.id);
      const source = catalog.find((original) => original.id === p.id)!;
      const chineseTerms = normalized.match(/[\p{Script=Han}]+/gu) ?? [];
      if (chineseTerms.some((term) => `${p.name} ${p.brand} ${p.description}`.includes(term))) return true;
      const words = new Set(
        `${p.id} ${source.name} ${source.brand} ${p.category} ${source.description}`
          .toLowerCase()
          .match(/[a-z0-9]+/g),
      );
      return searchTerms.some((term) => words.has(term));
    })
    .sort((a, b) => a.price - b.price || Number(a.id) - Number(b.id));
  return {
    products: matched.slice(0, input.limit ?? 8).map((p) => ({
      ...productSummary(p),
      description: p.description.slice(0, 120),
      specs: Object.fromEntries(
        Object.entries(p.specs).filter(([key]) =>
          ["容量", "重量", "尺寸", "防水", "收纳重量"].includes(key),
        ),
      ),
    })),
    total: matched.length,
    filters: input,
    dataSource: contosoSource,
    found: matched.length > 0,
  };
}
export function contosoSnapshot(id: string) {
  return {
    profile: customerProfile(id),
    orders: customerOrders(id),
    products,
    dataSource: contosoSource,
  };
}
