import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const file = new URL("../.env.local", import.meta.url);
if (existsSync(file)) {
  console.log("Existing .env.local preserved.");
  process.exit(0);
}
writeFileSync(
  file,
  `SITE_ORIGIN=http://127.0.0.1:3300\nSESSION_SECRET=${randomBytes(32).toString("hex")}\nTOOL_API_TOKEN=${randomBytes(32).toString("hex")}\nAGENT_STUDIO_BASE_URL=http://127.0.0.1:3020/api\nAGENT_STUDIO_AGENT_ID=5\nAGENT_STUDIO_API_KEY=\n`,
  { mode: 0o600 },
);
console.log("Created independent local configuration. No secrets printed.");
