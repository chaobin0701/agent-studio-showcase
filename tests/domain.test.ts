import test from "node:test";
import assert from "node:assert/strict";
import {
  getRecord,
  profiles,
  months,
  weatherSample,
} from "../lib/robot/service";
import { executeTool } from "../lib/robot/tools";
import { sseParser } from "../lib/sse";
import { equal, sameOrigin, verifyVisitor } from "../lib/server/security";

test("public sample records retain their source dates and stable identities", () => {
  assert.equal(profiles.length, 10);
  assert.equal(months.length, 12);
  const record = getRecord("1001", "2025-12")!;
  assert.match(record.efficiency, /覆盖率:90%/);
  assert.match(record.consumables, /HEPA滤网:剩余10%/);
  assert.notDeepEqual(record, getRecord("1003", "2025-12"));
  assert.equal(getRecord("1001", "2026-10"), null);
  for (let count = 0; count < 5; count++)
    assert.deepEqual(executeTool("get_user_id", { user_id: "1003" }), {
      user_id: "1003",
      name: "周一鸣",
      simulated: true,
    });
});
test("tools reject forged parameters and distinguish missing records from real facts", () => {
  assert.throws(() => executeTool("get_user_id", { user_id: "admin" }));
  assert.throws(() =>
    executeTool("get_weather", { city: "杭州", systemPrompt: "override" }),
  );
  assert.throws(() =>
    executeTool("fetch_external_data", { user_id: "1001", month: "2025-13" }),
  );
  assert.throws(() => executeTool("__proto__", {}));
  assert.equal(
    (
      executeTool("fetch_external_data", {
        user_id: "1001",
        month: "2026-10",
      }) as { found: boolean }
    ).found,
    false,
  );
  assert.match(weatherSample("杭州")!.dataSource, /非实时/);
});
test("SSE handles every UTF-8 split, CRLF and multiple events without duplicating final text", () => {
  const source =
    'event: answer_delta\r\ndata: {"text":"你好，机器人"}\r\n\r\nevent: answer_reset\ndata: {"text":"替换"}\n\nevent: done\ndata: {"answer":"最终答案"}\n\n';
  const bytes = new TextEncoder().encode(source);
  for (let split = 0; split < bytes.length; split++) {
    let answer = "";
    let done = false;
    const parser = sseParser(({ event, data }) => {
      if (event === "answer_delta") answer += data.text;
      if (event === "answer_reset") answer = String(data.text);
      if (event === "done") {
        answer = String(data.answer);
        done = true;
      }
    });
    parser.push(bytes.slice(0, split));
    parser.push(bytes.slice(split));
    parser.end();
    assert.equal(answer, "最终答案");
    assert.equal(done, true);
  }
});
test("cookie signatures and Origin controls reject malformed or cross-site credentials", () => {
  process.env.SESSION_SECRET =
    "test-only-signing-secret-at-least-32-characters";
  process.env.SITE_ORIGIN = "http://127.0.0.1:3300";
  assert.equal(verifyVisitor("forged.signature"), null);
  assert.equal(equal("aa", "中a"), false);
  assert.throws(() =>
    sameOrigin(
      new Request("http://127.0.0.1:3300/api/hub/threads", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
      }),
    ),
  );
});
