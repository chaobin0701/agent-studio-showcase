# Agent Studio Showcase

Independent Next.js/React/Node showcase project. Agent Studio is an optional external adapter, never a shared database or imported runtime.

- Preserve Solid and Zola source attribution and third-party licenses.
- Robot domain data/tools belong here. Expose HTTP/MCP through the shared domain service and input contracts.
- Keep sample data visibly simulated; retain source record dates. Do not label fixed weather as live observations.
- Keep keys server-side. Never commit `.env*`, `.data`, logs, screenshots, dependencies or builds.
- Anonymous visitor routing is scoped to visitor + Demo + simulated profile; never trust a browser-supplied platform userId.
- Treat only the upstream done event as completion. Stopping receipt is not execution cancellation; preserve idempotency on recovery.
- `connect-agent.ts` and `verify-live.ts` have external side effects; do not invoke them from ordinary start/build/test commands.
- Run meaningful transport/domain tests, typecheck, build and browser verification for relevant changes.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
