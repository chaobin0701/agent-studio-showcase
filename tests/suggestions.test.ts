import test from "node:test";
import assert from "node:assert/strict";
import { suggestedFollowUps, suggestionPage } from "../lib/suggestions";
import { demos, findDemo } from "../lib/catalog";
test("one robot Demo exposes its three features and resolves old entry links", () => {
  assert.equal(demos.filter((d) => d.slug.startsWith("robot")).length, 1);
  assert.ok(findDemo("contoso-outdoor"));
  assert.equal(demos[0].features.length, 3);
  assert.equal(findDemo("robot-weather"), demos[0]);
  assert.equal(findDemo("robot-report"), demos[0]);
  assert.equal(findDemo("missing"), undefined);
  assert.equal(findDemo("__proto__"), undefined);
});
test("recommendations mix all three topics and refresh through the full question bank", () => {
  for (const demo of ["robot-assistant", "contoso-outdoor"]) {
    const cycle = Array.from({ length: 18 }, (_, page) => suggestionPage(page, demo));
    for (const group of cycle) {
      assert.equal(group.length, 3);
      assert.equal(new Set(group.map((q) => q.category)).size, 3);
    }
    assert.equal(new Set(cycle.flat().map((q) => q.id)).size, 54);
    assert.deepEqual(suggestionPage(18, demo), suggestionPage(0, demo));
    assert.notDeepEqual(cycle[0].map((q) => q.id), cycle[1].map((q) => q.id));
  }
  assert.ok(suggestionPage(0, "contoso-outdoor").every((q) => !/机器人|拖布|天气/.test(q.question)));
});

test("structured follow-ups read only the explicit field and filter invalid entries", () => {
  assert.deepEqual(
    suggestedFollowUps({
      suggestedFollowUps: ["  对比两款帐篷？ ", "对比两款帐篷？", "", 3, "如何保养？", "预算还需要补充什么？", "第四条"],
      anotherField: ["不能从这里猜测"],
    }),
    ["对比两款帐篷？", "如何保养？", "预算还需要补充什么？"],
  );
  assert.deepEqual(suggestedFollowUps({ questions: ["不会读取这里"] }), []);
  assert.deepEqual(suggestedFollowUps(["不是对象"]), []);
  assert.deepEqual(suggestedFollowUps({ suggestedFollowUps: ["超长".repeat(61)] }), []);
});
