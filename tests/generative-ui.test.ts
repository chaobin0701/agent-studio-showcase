import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import catalog from "../lib/generative-ui/catalog.json";
import { definitions, validTree } from "../lib/generative-ui/definitions";
import { readUiBlocks, upsertUiBlock, type UiBlock } from "../lib/generative-ui/blocks";
import { GenerativeUiBlocks } from "../components/generative-ui";

const tree = { _type: "Card", title: "Overview", children: [
  { _type: "Row", children: [
    { _type: "Fact", _key: 1, label: "Count", value: 3 },
    { _type: "Chart", title: "Trend", chartType: "line", points: [{ label: "Today", value: 3 }] },
  ] },
  { _type: "Table", caption: "Rows", columns: ["Name", "Count"], rows: [["Alpha", 3]] },
] };
const block: UiBlock = { protocolVersion: 1, runId: "run-1", blockId: "run-1:call-1:0", toolCallId: "call-1",
  adapter: "assistant-ui", catalogVersion: catalog.version, revision: 1, status: "completed", tree, fallbackText: "Overview" };

test("component catalog and runtime tree validation agree", () => {
  assert.deepEqual(Object.keys(catalog.components), Object.keys(definitions));
  assert.equal(validTree(tree), true);
  assert.equal(validTree("root text"), false);
  assert.equal(validTree({ _type: "Card", title: "T", children: ["Safe text"] }), true);
  assert.equal(validTree({ ...tree, extra: "unexpected" }), false);
  assert.equal(validTree({ ...tree, _type: "Missing" }), false);
  assert.equal(validTree({ _type: "Chart", title: "Extreme", chartType: "bar", points: [{ label: "X", value: 1e308 }] }), false);
});

test("assistant-ui renders registered components and escapes model text", () => {
  const html = renderToStaticMarkup(createElement(GenerativeUiBlocks, { blocks: [block] }));
  for (const text of ["Overview", "Count", "Trend", "Rows", "Alpha"])
    assert.match(html, new RegExp(text));
  assert.match(html, /<svg/);
  assert.match(html, /<table/);
  const escaped = renderToStaticMarkup(createElement(GenerativeUiBlocks, { blocks: [{ ...block, tree: { _type: "Fact", label: "<script>", value: 3 } }] }));
  assert.match(escaped, /&lt;script&gt;/);
  assert.doesNotMatch(escaped, /<script>/);
});

test("unknown catalog or component falls back; live upsert and done snapshot do not duplicate blocks", () => {
  const fallback = renderToStaticMarkup(createElement(GenerativeUiBlocks, { blocks: [{ ...block, catalogVersion: "older", fallbackText: "Plain fallback" }] }));
  assert.match(fallback, /Plain fallback/);
  assert.doesNotMatch(fallback, /Overview/);
  const unknown = renderToStaticMarkup(createElement(GenerativeUiBlocks, { blocks: [{ ...block, tree: { _type: "Future" }, fallbackText: "Future fallback" }] }));
  assert.match(unknown, /Future fallback/);
  const live = upsertUiBlock([], block);
  assert.equal(upsertUiBlock(live, block).length, 1);
  const revised = upsertUiBlock(live, { ...block, revision: 2, fallbackText: "Revised" });
  assert.equal(revised.length, 1);
  assert.equal(revised[0].revision, 2);
  assert.deepEqual(readUiBlocks([block, { ...block, revision: 2, fallbackText: "Revised" }]), revised);
});
