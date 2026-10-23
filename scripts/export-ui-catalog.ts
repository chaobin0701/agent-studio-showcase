import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildPresentParameters, type GenerativeUILibrary } from "@assistant-ui/generative-ui/react";
import { z } from "zod";
import { definitions } from "../lib/generative-ui/definitions";

const library = Object.fromEntries(Object.entries(definitions).map(([name, def]) => [name, { ...def, render: () => null }])) satisfies GenerativeUILibrary;
const components = Object.fromEntries(Object.entries(definitions).map(([name, def]) => [name, { description: def.description, children: def.children, props: z.toJSONSchema(def.properties, { target: "draft-7" }) }]));
const parameters = buildPresentParameters(library);
const canonical = JSON.stringify({ parameters, components }, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const version = createHash("sha256").update(canonical).digest("hex");
const output = JSON.stringify({ adapter: "assistant-ui", version, parameters, components }, null, 2) + "\n";
const path = fileURLToPath(new URL("../lib/generative-ui/catalog.json", import.meta.url));
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8") !== output) throw new Error("组件目录已变化，请运行 npm run ui:catalog 更新并创建 Tool 新版本");
} else {
  writeFileSync(path, output);
  process.stdout.write(output);
}
