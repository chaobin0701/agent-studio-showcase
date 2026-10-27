import test from "node:test";
import assert from "node:assert/strict";
import { publicText } from "../lib/public-text";

test("history display keeps the original question and filters only the legacy trailing demo block", () => {
  const question = "请看看我的记录\n并给出建议";
  assert.equal(publicText(question), question);
  for (const data of [
    "模拟用户ID=1001；姓名=林小北；示例月份=2025-12。",
    "Contoso 模拟客户ID=1；姓名=John Smith；金额币种=USD。",
  ]) {
    assert.equal(publicText(`${question}\n\n[公开演示资料：${data}]`), question);
  }
  const nonTrailing = "提到[公开演示资料：样例]，请解释这段文字";
  assert.equal(publicText(nonTrailing), nonTrailing);
});
