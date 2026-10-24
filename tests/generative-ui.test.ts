import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import catalog from "../lib/generative-ui/catalog.json";
import { definitions, validTree } from "../lib/generative-ui/definitions";
import { readUiBlocks, upsertUiBlock, type UiBlock } from "../lib/generative-ui/blocks";
import { GenerativeUiBlocks } from "../components/generative-ui";
import initial from "../lib/generative-ui/catalogs/initial.json";
import { previewBlocks, examples } from "../lib/generative-ui/examples";
import { submissionMessage, uiSubmissionSchema } from "../lib/generative-ui/actions";

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

test("all 21 components validate and render; historical five-component catalog remains supported", () => {
  assert.equal(examples.length, 21);
  assert.deepEqual(examples.map(node => node._type), Object.keys(definitions));
  for (const item of previewBlocks) {
    assert.equal(validTree(item.tree), true, item.fallbackText);
    const html = renderToStaticMarkup(createElement(GenerativeUiBlocks, { blocks: [item] }));
    assert.ok(html.length > 100, item.fallbackText);
    assert.doesNotMatch(html, new RegExp(item.fallbackText));
  }
  const old = renderToStaticMarkup(createElement(GenerativeUiBlocks, { blocks: [{ ...block, catalogVersion: initial.version }] }));
  assert.match(old, /Overview/);
  assert.match(old, /<svg/);
  const wrongCatalog = renderToStaticMarkup(createElement(GenerativeUiBlocks, { blocks: [{ ...previewBlocks[17], catalogVersion: initial.version }] }));
  assert.match(wrongCatalog, /Choice 示例/);
});

test("interactive tree constraints and Markdown/URL boundaries are enforced", () => {
  const choice = examples[17];
  assert.equal(validTree({ _type: "Row", children: [choice, choice] }), false);
  assert.equal(validTree({ ...choice, options: [choice.options[0], choice.options[0]] }), false);
  assert.equal(validTree({ ...examples[19], fields: [{ name: "format", label: "格式", type: "select" }] }), false);
  for (const url of ["javascript:alert(1)", "data:text/html,test", "//evil.test/a", "/\\evil.test", "https://name:password@evil.test/a"]) {
    assert.equal(validTree({ _type: "Image", src: url, alt: "unsafe" }), false);
    assert.equal(validTree({ _type: "ActionButton", id: "link", label: "link", action: { type: "open_url", url } }), false);
  }
  const html = renderToStaticMarkup(createElement(GenerativeUiBlocks, { blocks: [{ ...block, tree: { _type: "Markdown", content: '<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n![example](/images/example.png)' } }] }));
  assert.doesNotMatch(html, /<script|javascript:|<p><figure/);
  assert.match(html, /<img/);
  assert.equal(uiSubmissionSchema.safeParse({ blockId: "x", revision: 1, componentId: "a", values: { x: Infinity } }).success, false);
  const cyclic: Record<string, unknown> = { _type: "Row" }; cyclic.children = cyclic;
  assert.equal(validTree(cyclic), false);
});

test("actions resolve only trusted props; selection, form and confirmation payloads validate", () => {
  const action = previewBlocks[18];
  const input = (i: number) => ({ blockId: previewBlocks[i].blockId, revision: 1, componentId: (previewBlocks[i].tree as { id: string }).id });
  assert.equal(submissionMessage(action, input(18)), "请继续介绍相关内容");
  assert.throws(() => submissionMessage(action, { ...input(18), revision: 2 }));
  assert.throws(() => submissionMessage(action, { ...input(18), componentId: "missing" }));
  assert.throws(() => submissionMessage(action, { ...input(18), values: { message: "forged" } }));
  assert.throws(() => submissionMessage({ ...action, tree: { ...examples[18], action: { type: "open_url", url: "/platform" } } }, input(18)));
  assert.match(submissionMessage(previewBlocks[17], { ...input(17), values: { selection: ["summary"] } }), /我的选择：简要摘要/);
  for (const selection of [[], ["unknown"], ["summary", "summary"], ["summary", "details"]])
    assert.throws(() => submissionMessage(previewBlocks[17], { ...input(17), values: { selection } }));
  assert.match(submissionMessage(previewBlocks[19], { ...input(19), values: { topic: "学习", count: 2, format: "full", date: "2026-10-23", examples: true } }), /主题：学习[\s\S]*格式：完整[\s\S]*包含示例：是/);
  for (const values of ([{}, { topic: " " }, { topic: "学习", date: "2026-02-30" }, { topic: "学习", count: "2" }, { topic: "学习", format: "unknown" }, { topic: "学习", extra: "forged" }] as Record<string, string>[]))
    assert.throws(() => submissionMessage(previewBlocks[19], { ...input(19), values }));
  assert.match(submissionMessage(previewBlocks[20], { ...input(20), decision: "cancel" }), /^我取消：/);
  assert.throws(() => submissionMessage(previewBlocks[20], input(20)));
});
