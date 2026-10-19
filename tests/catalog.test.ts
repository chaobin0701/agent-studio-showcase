import test from "node:test";
import assert from "node:assert/strict";
import { demos, demosForProject, projects, projectForDemo } from "../lib/catalog";

test("project detail pages only expose their associated experiences and legacy chat links keep their project", () => {
  assert.deepEqual(demosForProject("robot-lab").map((item) => item.slug), ["robot-assistant"]);
  assert.deepEqual(demosForProject("contoso-outdoor").map((item) => item.slug), ["contoso-outdoor"]);
  assert.deepEqual(demosForProject("agent-studio"), demos);
  assert.deepEqual(demosForProject("missing"), []);
  assert.deepEqual(demosForProject("__proto__"), []);
  for (const project of projects) {
    assert.ok(project.demoSlugs.every((slug) => demos.some((demo) => demo.slug === slug)));
  }
  assert.equal(projectForDemo("robot-weather")?.slug, "robot-lab");
  assert.equal(projectForDemo("robot-report")?.slug, "robot-lab");
  assert.equal(projectForDemo("contoso-outdoor")?.slug, "contoso-outdoor");
  assert.equal(projectForDemo("missing"), undefined);
});
