import test from "node:test";
import assert from "node:assert/strict";
import {
  suggestionPage,
  suggestionCategories,
  categoriesForDemo,
} from "../lib/suggestions";
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
test("Contoso has three categories with three choices, refreshes without repeats and stays separate from robot topics", () => {
  assert.equal(categoriesForDemo("contoso-outdoor").length, 3);
  for (const { key } of categoriesForDemo("contoso-outdoor")) {
    const first = suggestionPage(key, 0, "contoso-outdoor");
    const next = suggestionPage(key, 1, "contoso-outdoor");
    assert.equal(first.length, 3);
    assert.equal(next.length, 3);
    assert.equal(new Set([...first, ...next].map((q) => q.id)).size, 6);
    assert.ok(first.every((q) => q.category === key));
    assert.ok(first.every((q) => !/机器人|拖布|天气/.test(q.question)));
  }
});
test("recommendation refresh yields three distinct questions in each of three robot categories", () => {
  assert.equal(suggestionCategories.length, 3);
  for (const { key } of suggestionCategories) {
    const first = suggestionPage(key, 0);
    const next = suggestionPage(key, 1);
    assert.equal(first.length, 3);
    assert.equal(new Set(first.map((item) => item.id)).size, 3);
    assert.notDeepEqual(
      first.map((item) => item.id),
      next.map((item) => item.id),
    );
    assert.ok(first.every((item) => item.category === key));
    assert.equal(new Set(next.map((item) => item.id)).size, 3);
    assert.ok(
      first.every(
        (item) => !next.some((candidate) => candidate.id === item.id),
      ),
      "a refresh should provide three new choices",
    );
  }
  for (const demo of ["robot-assistant", "contoso-outdoor"]) {
    for (const category of categoriesForDemo(demo)) {
      const cycle = Array.from({ length: 6 }, (_, page) => suggestionPage(category.key, page, demo)).flat();
      assert.equal(new Set(cycle.map((q) => q.id)).size, 18);
      assert.deepEqual(suggestionPage(category.key, 6, demo), suggestionPage(category.key, 0, demo));
    }
  }
});
