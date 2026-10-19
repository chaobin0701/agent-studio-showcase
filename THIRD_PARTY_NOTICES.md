# Third-party sources

The project combines selected upstream UI components with an independent backend adapter and mock domain service. It does not reproduce Zola's model execution, Supabase authentication, provider credentials, or the reference project's Python Agent runtime.

## Contoso Chat

- Source: https://github.com/Azure-Samples/contoso-chat
- Commit: `028921fe3209db3216075d34ced6c109de132533`
- License: MIT, original text retained in `licenses/contoso-chat.txt`.
- Reused: 20 public fictional product entries, 20 Markdown manuals, and the purchasing records of 12 fictional customers. Original product CSV and two reference Prompty files are retained under `data/contoso/source/`; pinned source checksums are recorded in `data/contoso/provenance.json`.
- Modifications: normalized JSON projections with ISO dates, stable product links, extracted specifications, and a sorted order list; unused sample contact fields omitted and the literal `nan` membership mapped to null. Original English fixtures, sample USD prices and 2023 purchase dates are preserved in the source files. The separate zh-CN adaptation provides Chinese product/brand/customer names, translated descriptions/specifications and all 20 manuals, plus an independent fictional CNY price book. Displayed 2023 order amounts are recalculated from that price book; this is not a currency conversion or an actual merchant quote.
- New Node HTTP/MCP tools, independent presentation and a Chinese business prompt are implemented here. Azure infrastructure, Cosmos DB, model credentials and the upstream Python RAG execution are not imported. Manuals are uploaded through the existing Agent Studio knowledge APIs during an explicitly invoked operator setup.

## Zola

- Source: https://github.com/ibelick/zola
- Commit: `a1390f0f75481ae94a01d06d197e5e7bd83414f4`
- License: Apache-2.0, original text retained in `licenses/zola.txt`.
- Reused: `components/prompt-kit/{prompt-input,chat-container,scroll-button,message,markdown,code-block}.tsx`, shadcn UI button/tooltip/textarea/avatar, common copy button, text-morph, chat Markdown link and utilities.
- Modifications: independent chat transport and workspace composition; Chinese labels and accessibility; composition-safe Enter handling; external favicon requests removed; unknown code languages fall back to plain code; original provider, authentication and model APIs omitted.
- Zola itself is built with prompt-kit, shadcn/ui and motion-primitives; their original component implementation and attribution are retained through the source repository and its license. Dependencies retain their own licenses.

## Solid Free

- Source: https://github.com/NextJSTemplates/solid-nextjs
- Commit: `8e48747b93fbaf5c4beb04aaaf4efe70da94e98b`
- License: MIT, original text retained in `licenses/solid.txt`.
- Reused: `components/Hero/index.tsx`, `components/Common/SectionHeader.tsx`, hero and decorative shape assets.
- Modifications: Chinese independent branding, real project/demo navigation, template marketing forms and claims replaced; selected theme tokens retained. No Pro-only code is used.

## LangChain ReAct Agent

- Source: https://github.com/lhh737/LangChain-ReAct-Agent
- Commit: `301b0c3de7a1b14059b07d2b4015c76846539954`
- License: MIT, original text retained in `licenses/langchain-react-agent.txt`.
- Reused: `data/external/records.csv`, stored unchanged as `data/robot-records.csv`; JSON is a normalized projection with literal `\\n` converted to line breaks.
- Reference: `agent/tools/agent_tools.py` tool names and robot-support/report scenario. Node implementations are independent; random identity/month selection and dynamic Python prompt middleware are not copied.
- Added simulated names and stable city/weather fixtures are clearly labeled as public examples. Original record dates are preserved.
