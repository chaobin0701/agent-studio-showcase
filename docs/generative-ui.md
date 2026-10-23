# Generative UI catalog

The showcase renders `present` blocks with `@assistant-ui/generative-ui`. The component registry is in `lib/generative-ui/definitions.ts`; `components/generative-ui.tsx` supplies their React renderers. `scripts/export-ui-catalog.ts` calls assistant-ui's `buildPresentParameters` and exports `lib/generative-ui/catalog.json`, including a SHA-256 version of the schema and component definitions.

Run `npm run ui:catalog` after changing components, and `npm run ui:catalog:check` in CI. Deploy the showcase first, then paste the complete JSON catalog into a new published UI Tool version in Agent Studio and explicitly bind that version to an Agent. The server needs no component code. The first catalog includes Card, Row, Fact, Chart, and Table; all are read-only.

The chat consumes `tool_ui` as an upsert keyed by `blockId`, then uses `done.uiBlocks` as the authoritative full snapshot. History uses the same block shape. A version or component unknown to this deployed showcase displays the server's `fallbackText`, so older conversations remain readable after catalog changes. Only the `done` event completes a response; `answer_delta` remains the text channel. See the platform repository's `docs/generative-ui.md` for the wire contract.
