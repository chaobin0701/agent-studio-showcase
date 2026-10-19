import test from "node:test";
import assert from "node:assert/strict";
import {
  products,
  getProduct,
  getCustomer,
  customerOrders,
  searchProducts,
  customerProfile,
  knowledgeManual,
  customers,
} from "../lib/contoso/service";
import sourceCustomers from "../data/contoso/customers.json";
import sourceProducts from "../data/contoso/products.json";
import { productManual } from "../lib/contoso/manuals";
import { contosoProfiles } from "../lib/contoso/localization";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { executeContosoTool } from "../lib/contoso/tools";
import { validDemoContext } from "../lib/demo-profiles";
import { demoConnection } from "../lib/server/connections";

test("Chinese fixtures preserve identities and dates while using one consistent CNY price book", () => {
  assert.equal(products.length, 20);
  assert.equal(customers.length, 12);
  assert.equal(customers.flatMap((c) => c.orders).length, 32);
  assert.equal(getProduct("1")?.price, 1699);
  assert.equal(getProduct("1")?.name, "远行者 X4 四人帐篷");
  assert.equal(getProduct("1")?.capacityPeople, 4);
  assert.equal(getProduct("1")?.specs["门数"], "2");
  assert.equal(getProduct("15")?.specs["颜色"], "蓝色");
  assert.ok(!Object.hasOwn(getProduct("1")!.specs, "Warranty Coverage"));
  assert.equal(customerProfile("6")?.membership, null);
  assert.equal(customerProfile("6")?.membershipName, "未提供");
  assert.equal(customerProfile("1")?.name, "张晨");
  assert.equal(customerProfile("3")?.name, "王浩");
  assert.equal(customerProfile("2")?.membershipName, "黄金会员");
  for (const customer of customers) {
    const source = sourceCustomers.find((c) => c.id === customer.id)!;
    assert.deepEqual(customer.orders.map((o) => [o.id, o.productId, o.quantity, o.date]), source.orders.map((o) => [o.id, o.productId, o.quantity, o.date]));
    assert.ok(customer.orders.every((o) => o.date.startsWith("2023-")));
    assert.deepEqual(
      customer.orders.map((o) => o.date),
      [...customer.orders.map((o) => o.date)].sort().reverse(),
    );
    for (const order of customer.orders) {
      assert.equal(order.unitPrice, getProduct(order.productId)!.price);
      assert.equal(order.total, order.quantity * order.unitPrice);
      assert.equal(order.currency, "CNY");
    }
  }
  assert.equal(customerOrders("999"), null);
  assert.equal(getCustomer("__proto__"), null);
});
test("Budget and capacity are enforced together; zero matches never silently relax constraints", () => {
  const result = searchProducts({
    category: "Tents",
    max_price: 2000,
    min_capacity: 4,
  });
  assert.deepEqual(
    result.products.map((p) => p.id),
    ["1"],
  );
  assert.equal(
    searchProducts({ category: "Tents", max_price: 2000, min_capacity: 8 })
      .found,
    false,
  );
  assert.equal(searchProducts({ max_price: 0 }).total, 0);
  assert.ok(
    searchProducts({ query: "帐篷" }).products.every(
      (p) => p.category === "Tents",
    ),
  );
  assert.equal(searchProducts({ query: "供应链管理" }).total, 0);
  for (const query of ["远行者 X4 四人帐篷", "TrailMaster X4 Tent", "远行者"]) {
    assert.deepEqual(searchProducts({ query }).products.map((p) => p.id), ["1"]);
  }
  assert.equal(searchProducts({ query: "远行者 X4 四人帐篷", max_price: 1000 }).total, 0);
  assert.ok(searchProducts({ query: "帐篷" }).products.every((p) => p.currency === "CNY"));
  assert.throws(() =>
    executeContosoTool("contoso_search_products", { max_price: "not-a-price" }),
  );
  assert.throws(() =>
    executeContosoTool("contoso_search_products", { max_price: -1 }),
  );
  assert.throws(() =>
    executeContosoTool("contoso_search_products", {
      query: "帐篷",
      systemPrompt: "override",
    }),
  );
});
test("Read-only tools validate stable IDs and preserve the source boundary", () => {
  const result = executeContosoTool("contoso_compare_products", {
    product_ids: "1,15",
  }) as { products: { id: string }[] };
  assert.deepEqual(
    result.products.map((p) => p.id),
    ["1", "15"],
  );
  assert.deepEqual(
    (result.products[0] as any).specs,
    getProduct("1")!.specs,
    "Comparisons must keep all source specifications, not turn omitted fields into unknown facts.",
  );
  for (const value of ["1,1", "1,99", "../1,2", "1", "1,2,3,4,5"])
    assert.throws(() =>
      executeContosoTool("contoso_compare_products", { product_ids: value }),
    );
  assert.throws(() =>
    executeContosoTool("contoso_get_orders", { customer_id: "1001" }),
  );
  assert.throws(() => executeContosoTool("__proto__", {}));
  const orders = executeContosoTool("contoso_get_orders", {
    customer_id: "1",
  }) as any;
  assert.equal(orders.orders.length, 3);
  assert.equal(orders.dataSource.orderYear, "2023");
  assert.equal(orders.dataSource.simulated, true);
  assert.deepEqual(orders.summary, {
    orderCount: 3,
    itemQuantity: 5,
    totalAmount: 8595,
    currency: "CNY",
    distinctProducts: 3,
  });
  assert.equal((executeContosoTool("contoso_get_orders", { customer_id: "3" }) as any).summary.totalAmount, 2346);
  assert.ok(!Object.hasOwn(orders.summary, "totalUSD"));
  assert.ok(
    JSON.stringify(orders).length < 3000,
    "Structured order facts should not require filesystem searching.",
  );
  assert.ok(!JSON.stringify(orders).includes("@example.com"));
});
test("Knowledge copies retain manual content and put product identity in the parent heading", () => {
  const original =
    "# Information about product item_number: 1\nTrailMaster X4 Tent, price $250\n\n## User Guide\n\n### Tent Setup\nStep 1: Select a level area.\n";
  const indexed = knowledgeManual("TrailMaster X4 Tent", "1", original);
  assert.match(indexed, /^# TrailMaster X4 Tent（商品 ID 1）/);
  assert.ok(indexed.includes("### Tent Setup\nStep 1: Select a level area."));
  assert.ok(indexed.includes("price $250"));
});
test("All twenty Chinese manuals preserve source provenance, numeric facts and matching catalog identity", () => {
  const provenance = JSON.parse(readFileSync("data/contoso/zh-CN/provenance.json", "utf8"));
  for (const product of products) {
    assert.match(product.name, /\p{Script=Han}/u);
    assert.match(product.brand, /\p{Script=Han}/u);
    assert.match(product.description, /\p{Script=Han}/u);
    assert.equal(product.currency, "CNY");
    const original = sourceProducts.find((p) => p.id === product.id)!;
    assert.equal(Object.keys(product.specs).length, Object.keys(original.specs).length);
    const numbers = (values: string[]) => values.flatMap((value) => value.match(/\d+(?:\.\d+)?/g) ?? []).sort();
    assert.deepEqual(
      numbers(Object.entries(product.specs).filter(([key]) => key !== "价格").map(([, value]) => value)),
      numbers(Object.entries(original.specs).filter(([key]) => key !== "Price").map(([, value]) => value)),
      `Product ${product.id} must retain every original numeric specification.`,
    );
    const manual = productManual(product);
    assert.ok(manual.startsWith(`# ${product.name}（商品 ID ${product.id}）`));
    assert.ok(manual.includes(new Intl.NumberFormat("zh-CN").format(product.price)));
    assert.match(manual, /人民币模拟价格/);
    assert.match(manual, /## .*使用|## .*用户|## .*指南/);
    assert.doesNotMatch(manual, /price \$|## (?:User Guide|Features|Technical Specs|FAQ)|TrailMaster|Adventurer Pro/);
    assert.doesNotMatch(manual, /\d\s*美元|\$\d|ZXQTERM|反光口音|齿轮环|股份|引擎盖/);
    const sourceText = readFileSync(`data/contoso/manuals/product_info_${product.id}.md`, "utf8");
    const chineseText = readFileSync(`data/contoso/zh-CN/manuals/product_info_${product.id}.md`, "utf8");
    assert.equal((chineseText.match(/^## /gm) ?? []).length, (sourceText.match(/^## /gm) ?? []).length);
    const raw = readFileSync(`data/contoso/manuals/product_info_${product.id}.md`);
    assert.equal(createHash("sha256").update(raw).digest("hex"), provenance.sourceManualSha256[product.id]);
  }
  assert.equal(contosoProfiles.length, 12);
  assert.deepEqual(contosoProfiles.map((p) => p.name), customers.map((c) => c.name));
  assert.equal(getProduct("15")?.specs["帐篷包尺寸（原资料字段）"].replaceAll(/\s/g, ""), "7英尺×5英尺×4英尺");
});
test("Demo profiles and platform credentials cannot fall back across domains", () => {
  assert.equal(validDemoContext("contoso-outdoor", "contoso-1", "2023"), true);
  assert.equal(validDemoContext("contoso-outdoor", "1001", "2025-12"), false);
  assert.equal(validDemoContext("robot-assistant", "contoso-1", "2023"), false);
  process.env.AGENT_STUDIO_API_KEY = "robot-test-key";
  delete process.env.AGENT_STUDIO_CONTOSO_API_KEY;
  assert.equal(demoConnection("contoso-outdoor").apiKey, undefined);
  assert.equal(demoConnection("robot-report").apiKey, "robot-test-key");
});
