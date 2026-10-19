import { readFileSync } from "node:fs";
import path from "node:path";
import { knowledgeManual, type products } from "./service";
import { formatCny } from "./localization";

/** Server pages and explicit knowledge-upload scripts share the same document. */
export function productManual(product: (typeof products)[number]) {
  let body = readFileSync(
    path.join(process.cwd(), "data/contoso/zh-CN/manuals", `product_info_${product.id}.md`),
    "utf8",
  );
  if (Object.keys(product.specs).length) {
    body = body.replace(
      /^## 技术规格\s*\n[\s\S]*?(?=^## |$(?![\s\S]))/m,
      "## 技术规格\n\n" + Object.entries(product.specs)
        .map(([key, value]) => `- **${key}**：${value}`)
        .join("\n") + "\n\n",
    );
  }
  return knowledgeManual(
    product.name,
    product.id,
    `人民币模拟价格：${formatCny(product.price)}。\n\n` +
      "本文为 Contoso Chat 公开样例说明书的中文改编，MIT 授权。商品、评价、保修、退货和联络信息均为虚构演示资料，不构成实际销售或服务承诺。人民币定价独立于英文原始美元样例。\n\n" + body,
  );
}
