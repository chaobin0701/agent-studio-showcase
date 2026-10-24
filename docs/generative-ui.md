# Generative UI catalog

The showcase renders `present` blocks with `@assistant-ui/generative-ui`. The component registry is in `lib/generative-ui/definitions.ts`; `components/generative-ui.tsx` supplies their React renderers. `scripts/export-ui-catalog.ts` calls assistant-ui's `buildPresentParameters` and exports `lib/generative-ui/catalog.json`, including a SHA-256 version of the schema and component definitions.

Run `npm run ui:catalog` after changing components, and `npm run ui:catalog:check` in CI. Deploy the showcase first, then paste the complete JSON catalog into a new published UI Tool version in Agent Studio and explicitly bind that version to an Agent. The platform server needs no component code. Development does not publish either resource automatically.

The current catalog includes 21 components:

| Purpose | Components |
| --- | --- |
| Layout and summaries | Card, Row, Fact, KeyValue, Badge, Tag |
| Content and references | Markdown, Alert, Image, Gallery, List |
| Data and process | Chart, Table, Steps, Timeline |
| Content navigation | Accordion, Tabs |
| User input | Choice, ActionButton, Form, Confirmation |

Visit `/ui-preview` to try all components without calling an Agent. Markdown uses react-markdown with raw HTML disabled; Accordion and Tabs use Radix. Image URLs and links allow HTTPS or site-relative paths. Images load directly in the browser with an unavailable-image fallback.

The robot example's optional [adaptive consultation Skill](../skills/robot-cleaner-guidance/SKILL.md) guides the Agent to choose UI from natural questions: short forms for missing selection criteria, stepwise troubleshooting and grouped maintenance instructions, with plain text for simple questions and immediate safety guidance for hazards. Import it through Agent Studio's existing Skill management, test/publish it and bind its published version to the example Agent; the file alone does not activate it. The `present` Tool must remain explicitly bound to the Agent. This domain guidance lives in the showcase and does not add robot logic to the platform.

The chat consumes `tool_ui` as an upsert keyed by `blockId`, then uses `done.uiBlocks` as the authoritative full snapshot. History uses the same block shape. The initial five-component catalog is retained in `lib/generative-ui/catalogs/initial.json`; preserve each deployed catalog before replacing it. A version or component unknown to this deployed showcase displays the server's `fallbackText`. Only the `done` event completes a response; `answer_delta` remains the text channel. See the platform repository's `docs/generative-ui.md` for the wire contract.

Interactive components send a new user message through the existing chat transport; they never execute arbitrary tools or HTTP actions directly. Confirmation records intent and does not replace platform Tool approval. ActionButton supports only `send_message` and `open_url`; Form supports text, textarea, number, select, date and checkbox fields. Unsubmitted form drafts are transient.

The chat endpoint accepts either `{threadId, requestId, message}` or `{threadId, requestId, uiSubmission: {blockId, revision, componentId, values?, decision?}}`. The showcase server checks Origin, visitor/thread ownership and the persisted completed source UI, validates values, and derives the next-turn message from the trusted component props. Browser-provided text/actions are not accepted as UI submissions. The platform still receives an ordinary message.

SQLite submission receipts are written atomically with the existing request, keyed by thread/block/revision/component. History returns `uiReceipts`; refresh restores submitted values and disables those controls. Duplicate new requests are rejected, while explicit recovery preserves the original idempotency key and body. An uncertain delivery blocks further submissions until status refresh/recovery. Unrelated composer drafts are preserved when a UI card submits.
