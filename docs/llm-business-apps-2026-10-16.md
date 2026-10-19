# 可用于展示站的实用 LLM 应用调研

检索日期：2026-10-16。按“具体业务场景、可读的提示词、可用的示例资料、许可证和接入成本”筛选，已读取下列项目的实际源文件。此轮没有安装或运行这些应用，没有调用付费模型，也没有修改 Agent Studio 配置。

“适合做什么产品”和“移植难度”是结合当前 Demo Hub 作出的判断，不代表项目已经验证了商业收益。下方体验问题为本次撰写，和上游系统提示词分开标注。

**优先看这三个方向：创业与竞品调研、品牌素材工作室、经营数据分析。** 它们与现有扫地机器人助手的体验差异比较大。每个业务场景作为一个 Demo，检索、工具、报告或图表放在这个 Demo 内。

| 应用 | 适合的实用 / 创业场景 | 上游已有资料 | 代码许可 / 状态 | 接入判断 |
| --- | --- | --- | --- | --- |
| GPT Researcher | 创业调研、竞品比较、公司资料研究 | 研究提示词、虚构公司文档、示例任务 | Apache-2.0；未归档 | 文本报告版本可先做，联网研究需要搜索服务 |
| Google On-Brand GenMedia | 品牌视觉素材、营销代理工作室 | 品牌手册 PDF、素材图、规则 JSON、生成与评分提示词 | Apache-2.0；未归档 | 视觉效果突出，需要图片生成与评估工具 |
| Google Brand Search Optimization | 商品标题优化、零结果搜索诊断 | 商品种子 SQL、示例交互、任务提示词 | Apache-2.0；未归档 | 先用本地商品与搜索快照；原版依赖 BigQuery 和浏览器 |
| Contoso Chat | 零售导购、售后知识、订单上下文问答 | 商品 CSV、20 份说明书、12 份客户 JSON、评测样例 | MIT；已归档 | 资料完整，适合复用场景与数据，原版 Azure 依赖较重 |
| SalesGPT | 商品咨询、销售异议处理、销售陪练 | 中英文提示词、床垫商品目录 | MIT；未归档，最近推送为 2024-09 | 小而清楚；旧式 Agent 协议需要改写 |
| AWS RFP Assistant | SaaS 供应商问卷、标书应答 | RFP 提示词、两工作表 Excel 问卷 | MIT-0；未归档，最近推送为 2024-11 | 公司能力资料需补齐；原版云服务较多 |
| Microsoft Data Formulator | 小企业经营分析、数据探索、图表报告 | 内嵌样例片段、公开数据 URL、分析相关提示词 | MIT；未归档 | 完整产品较重，先提炼“问数 + 图表 + 解释” |
| Resume Screening Toolkit | 简历与岗位匹配解释、面试准备 | 6 份虚构简历 TXT/PDF、2 份 JD、HTML/CSV 输出 | MIT；未归档，小型项目 | 适合小范围原型；默认离线模式采用 fake provider |

以上许可已读取仓库 LICENSE；具体第三方数据与素材仍以各自声明为准。状态来自检索时 GitHub 仓库信息。未归档不等于已验证可运行。

**1. GPT Researcher：创业与竞品研究助手**

[项目](https://github.com/assafelovic/gpt-researcher) · [许可证](https://github.com/assafelovic/gpt-researcher/blob/main/LICENSE)

它能围绕一个主题收集资料、研究并输出带引用的报告，也支持指定网页、本地文档和混合资料。适合把“一个创业想法”展开为竞品、客户需求、定价与待验证假设。

- 提示词：[研究提示词](https://github.com/assafelovic/gpt-researcher/blob/main/gpt_researcher/prompts.py)，[编辑与研究角色提示词](https://github.com/assafelovic/gpt-researcher/blob/main/deep_agents/agent.py)。
- 现成资料：[虚构公司文档目录](https://github.com/assafelovic/gpt-researcher/tree/main/deep_agents/benchmark_data/internal_docs)，包含公司概况、产品说明、经营报告、董事会材料和其他内部文档。它是测试用语料，不是真实公司的内部文件；[基准说明](https://github.com/assafelovic/gpt-researcher/blob/main/deep_agents/BENCHMARK.md)明确说明这一点。
- 可读源稿与再生成：[语料构建脚本](https://github.com/assafelovic/gpt-researcher/blob/main/deep_agents/benchmark_data/build_corpus.py)。资料包含不同年份与旧版内容，适合展示引用、时间辨别与冲突解释。
- 改造建议：先做“资料库研究”，再增加联网竞品资料。示例公司的经营资料只能支持该虚构公司相关问题；换成其他创业主题时要准备对应资料。
- 体验问题示例：“根据这家公司的经营报告与产品资料，概括收入模式、增长因素和需要继续核实的三个问题，并标明来源与年份。”

商业产品方向可理解为小团队研究助理或行业垂直研究工具。移植时优先参考提示词、资料和报告结构，执行仍交给现有 Agent Studio；不需要再引入整套研究运行时。

**2. Google On-Brand GenMedia：品牌素材工作室**

[项目与运行说明](https://github.com/google/adk-recipes/tree/main/contrib/python/on-brand-genmedia) · [许可证](https://github.com/google/adk-recipes/blob/main/LICENSE)

输入一段创意描述，读取品牌规则和素材，生成图片，再按品牌要求评分、反馈或重试。上游使用虚构品牌 NeuroVibe AI。

- 提示词：[生成提示词](https://github.com/google/adk-recipes/blob/main/contrib/python/on-brand-genmedia/app/sub_agents/prompt/prompt.py)，[图片评分提示词](https://github.com/google/adk-recipes/blob/main/contrib/python/on-brand-genmedia/app/sub_agents/scoring/prompt.py)。
- 现成资料：[品牌手册 PDF](https://github.com/google/adk-recipes/blob/main/contrib/python/on-brand-genmedia/app/data/NeuroVibe_AI_Brand_Guidelines.pdf)，[参考素材和示例图片](https://github.com/google/adk-recipes/tree/main/contrib/python/on-brand-genmedia/app/data)，[品牌规则 JSON](https://github.com/google/adk-recipes/blob/main/contrib/python/on-brand-genmedia/app/policy.json)。
- 可展示能力：读品牌资料、寻找参考图、生成图片、解释评分并修订。相比纯文本聊天，结果更容易在主页上展示。
- 改造建议：先支持一套固定虚构品牌；图片生成、素材读取和评分作为工具。原项目依赖 Google Cloud 与图片模型，需要接入当前平台可用的相应服务。
- 体验问题示例：“按品牌手册生成一张员工活动宣传图，使用指定配色与公司 T 恤，并说明有哪些要求已经满足。”

这个案例更适合从“遵守品牌资料的图片生成”开始；文案、排期等能力属于后续扩展，不是该示例已经完整提供的功能。

**3. Google Brand Search Optimization：商品标题与搜索优化**

[项目与运行说明](https://github.com/google/adk-recipes/tree/main/contrib/python/brand-search-optimization) · [许可证](https://github.com/google/adk-recipes/blob/main/LICENSE)

读取品牌商品，提取购物关键词，观察零售搜索结果中的竞争商品，再输出标题差距、评分和改写建议。这个场景比泛化的“帮我写营销文案”更具体。

- 提示词：[协调提示词](https://github.com/google/adk-recipes/blob/main/contrib/python/brand-search-optimization/app/prompt.py)，[各步骤提示词](https://github.com/google/adk-recipes/tree/main/contrib/python/brand-search-optimization/app/sub_agents)。
- 现成资料：[商品种子 SQL](https://github.com/google/adk-recipes/blob/main/contrib/python/brand-search-optimization/deployment/bq_data_setup.sql)，含 3 个测试品牌童鞋商品；[示例交互](https://github.com/google/adk-recipes/blob/main/contrib/python/brand-search-optimization/tests/example_interaction.md)。
- 资料边界：这不是完整的真实品牌数据集。竞品结果来自运行时浏览；做稳定演示时应另存注明日期的搜索快照。
- 改造建议：商品目录和固定搜索快照可以由 Demo Hub 提供 HTTP/MCP 工具，先完成可重复的演示。接入真实搜索和效果跟踪另作扩展。
- 体验问题示例：“这款童鞋标题缺少哪些购买意图？给出三个改写版本，并逐项说明依据。”

原版涉及 BigQuery、Gemini Computer Use 和浏览器。代码中的搜索评分是该方案的评价指标，不应直接当作真实销量提升证明。

**4. Contoso Chat：有商品资料和客户订单的零售助手**

[项目](https://github.com/Azure-Samples/contoso-chat) · [许可证](https://github.com/Azure-Samples/contoso-chat/blob/main/LICENSE)

虚构户外用品商店的 RAG 助手，可以结合商品资料和客户历史订单回答问题。它的优势是资料比较齐全，容易构成一个连贯的业务 Demo。

- 提示词：[chat.prompty](https://github.com/Azure-Samples/contoso-chat/blob/main/src/api/contoso_chat/chat.prompty)，[检索查询提示词](https://github.com/Azure-Samples/contoso-chat/blob/main/src/api/contoso_chat/product/product.prompty)。
- 现成资料：[商品 CSV](https://github.com/Azure-Samples/contoso-chat/blob/main/data/product_info/products.csv)，[20 份商品说明书](https://github.com/Azure-Samples/contoso-chat/tree/main/data/manual_info/manuals)，[12 份客户资料及订单 JSON](https://github.com/Azure-Samples/contoso-chat/tree/main/data/customer_info)。
- 可展示能力：按需求选品、比较规格、依据说明书回答、结合订单上下文推荐。
- 改造建议：说明书进入知识库，商品与订单通过工具查询，在现有聊天页展示商品卡片和来源。商品推荐与售后解释放在一个 Demo 内。
- 体验问题示例：“我之前买了帐篷，这次两人秋季露营还缺什么？请结合历史订单说明推荐理由。”

检索时仓库已归档。原版采用 Azure AI Search、Cosmos DB 等服务；当前项目更适合提取场景、数据与提示词，再接既有平台。

**5. SalesGPT：销售咨询与异议处理**

[项目](https://github.com/filip-michalsky/SalesGPT) · [许可证](https://github.com/filip-michalsky/SalesGPT/blob/main/LICENSE)

围绕介绍、了解需求、说明价值、提供方案和处理异议等销售阶段组织对话。适合演示商品咨询或销售陪练。

- 提示词：[英文版本](https://github.com/filip-michalsky/SalesGPT/blob/main/salesgpt/prompts.py)，[中文版本](https://github.com/filip-michalsky/SalesGPT/blob/main/salesgpt/prompts_cn.py)。
- 现成资料：[床垫商品目录](https://github.com/filip-michalsky/SalesGPT/blob/main/examples/sample_product_catalog.txt)，含价格、尺寸和卖点，另有第二份目录样例。
- 可展示能力：多轮澄清预算与需求、基于目录推荐、应对“价格太高”等异议。
- 改造建议：保留场景与阶段设计，将旧式文本工具协议改成现有平台的工具调用；中文提示词中的具体销售话术也需要按网站主动咨询场景重写。
- 体验问题示例：“两个人睡、怕热、预算有限，应该选哪款床垫？你可以先问我两个问题。”

最近推送为 2024-09，资料规模也较小。作为易读案例不错，但与已有机器人咨询 Demo 相似度较高，所以扩展优先级低于调研、品牌和图表。

**6. AWS RFP Assistant：供应商问卷与标书应答**

[项目](https://github.com/aws-samples/aws-genai-rfpassistant) · [许可证](https://github.com/aws-samples/aws-genai-rfpassistant/blob/main/LICENSE)

上传公司知识资料，再上传包含问题的 Excel，逐项生成回答，允许人工修改并导出。适合面向 B2B SaaS 团队的供应商调查问卷、能力问卷和投标辅助。

- 提示词：[Claude RFP 应答模板](https://github.com/aws-samples/aws-genai-rfpassistant/blob/main/lib/model-interfaces/langchain/functions/request-handler/adapters/bedrock/claude.py)。
- 现成资料：[Excel 示例问卷](https://github.com/aws-samples/aws-genai-rfpassistant/blob/main/assets/example_file.xlsx)。已检查文件为有效 XLSX，包含两个工作表，问题涉及数据隔离、托管区域、加密等。
- 资料边界：有问卷模板，公司产品能力、部署方案和服务说明需要自己补齐，不能直接承诺“资料已经全了”。
- 改造建议：为一家具名的虚构 SaaS 准备能力文档，展示“找依据 → 起草回答 → 标出缺失信息 → 人工修改 → 导出”。
- 体验问题示例：“根据我们的产品资料填写这份供应商问卷；每项附依据，资料缺失的题目列到待补充清单。”

原版依赖 Bedrock、CDK、存储、检索和认证等多项 AWS 服务，最近推送为 2024-11。值得借鉴的是应答业务流程，移植成本高于小型咨询 Demo。

**7. Microsoft Data Formulator：数据分析与可视化工作台**

[项目](https://github.com/microsoft/data-formulator) · [许可证](https://github.com/microsoft/data-formulator/blob/main/LICENSE)

用自然语言与可视化交互探索数据，支持沿着分析问题继续追问、分支和形成报告。可借鉴为小企业经营数据助手。

- 提示词：[Agents 源码](https://github.com/microsoft/data-formulator/tree/main/py-src/data_formulator/agents)，例如 [数据筛选等任务提示词](https://github.com/microsoft/data-formulator/blob/main/py-src/data_formulator/agents/agent_simple.py)。
- 示例资料：[数据集配置](https://github.com/microsoft/data-formulator/blob/main/py-src/data_formulator/example_datasets_config.py)，包括内嵌预览与公开数据下载地址，例如电影、收入等；完整表通常在运行时从外部 URL 导入，并非所有 CSV 都随仓库保存。
- 资料边界：现成样例主要用于通用数据分析。要做门店经营或电商收入 Demo，应另外准备模拟订单、渠道和日期数据。
- 改造建议：先取一个很小的业务问题，展示“询问 → 查询 → 图表 → 解释”，保留用于复核的原始表。完整上游产品的界面和执行系统较重。
- 体验问题示例：“比较各渠道本月与上月收入，用图表说明变化最大的渠道，再显示计算用到的数据。”

原项目是 React/TypeScript 界面与 Python 后端的组合，不是纯 Node 项目。若接入当前站点，展示和业务数据服务可继续使用 Next.js，分析能力由现有平台与受约束的工具承担。

**8. Resume Screening Toolkit：简历匹配解释与面试准备**

[项目](https://github.com/Rhed-Dev/resume-screening-toolkit) · [许可证](https://github.com/Rhed-Dev/resume-screening-toolkit/blob/main/LICENSE)

解析简历与岗位要求，解释匹配和差距，并生成面试问题。展示站适合取其中的“差距分析与面试准备”体验。

- 提示词：[结构化提取模板](https://github.com/Rhed-Dev/resume-screening-toolkit/blob/main/src/resume_screening_toolkit/extraction.py)，[面试问题生成](https://github.com/Rhed-Dev/resume-screening-toolkit/blob/main/src/resume_screening_toolkit/questions.py)。
- 现成资料：[6 份虚构简历 TXT](https://github.com/Rhed-Dev/resume-screening-toolkit/tree/main/fixtures/resumes)，[PDF 版本](https://github.com/Rhed-Dev/resume-screening-toolkit/tree/main/fixtures/resumes_pdf)，[2 份岗位 JD](https://github.com/Rhed-Dev/resume-screening-toolkit/tree/main/fixtures/jds)，[报告示例](https://github.com/Rhed-Dev/resume-screening-toolkit/tree/main/examples)。
- 模式边界：默认 fake provider 支持离线演示，其输出不能当作实际 LLM 效果；真实模型适配器需单独配置。源码也包含确定性打分与差距逻辑，并非所有结果都由模型生成。
- 改造建议：复用虚构材料，展示岗位要求与简历证据的对应关系、需要澄清的问题和面试练习题。求职者也可以用来准备面试。
- 体验问题示例：“根据这份 JD 和简历，给出三项已有证据的优势、三项需要补充的证据，再生成五道面试练习题。”

这是很小的项目，当前适合作为案例材料与原型参考，尚未在本机验证运行质量。

**值得补充收藏的资料**

- [IntelCue Competitive Intelligence Prompts](https://github.com/IntelCue/competitive-intelligence-prompts)：MIT 提示词库；[创业市场调研](https://github.com/IntelCue/competitive-intelligence-prompts/blob/main/prompts/agents/market-research-agent.md)、[定价拆解](https://github.com/IntelCue/competitive-intelligence-prompts/blob/main/prompts/competitor-analysis/pricing-analysis.md)、功能对比和内容差距等模板适合细化 GPT Researcher 的任务。它是提示词库，不能单独当作完整应用；具体竞品资料需要联网获取或自行提供。
- [Firecrawl App Examples](https://github.com/firecrawl/firecrawl-app-examples)：可以继续看 [竞品分析 Node.js 示例](https://github.com/firecrawl/firecrawl-app-examples/tree/main/search-competitor-analysis)、[客户评价分析](https://github.com/firecrawl/firecrawl-app-examples/tree/main/review-analyzer)、[公司情报](https://github.com/firecrawl/firecrawl-app-examples/tree/main/search-email-to-company-intel)。源码中的提示词与抓取流程容易理解，材料大多来自运行时网页。检索时未找到覆盖这些子项目的统一根 LICENSE，不能直接按 Firecrawl 其他仓库的许可推断可复制范围。
- [LangGraph 航旅客服历史案例](https://github.com/langchain-ai/langgraph/blob/23961cff61a42b52525f3b20b4094d8d2fba1744/docs/docs/tutorials/customer-support/customer-support.ipynb)：含完整提示词、工具、航班改签、酒店与租车等流程，代码引用外部 SQLite 和 FAQ 下载地址。当前 main 上的旧入口仅保留迁移说明，应用参考应看这个固定历史版本；演示数据库也要单独核对数据许可。适合后续做有操作确认的事务型 Demo。

**落到当前站点的建议**

第一批优先选择一个：

1. 创业与竞品研究：商业问题清楚，有提示词和资料可读；先做引用准确的资料研究，再接联网工具。
2. 品牌素材工作室：现成品牌资料最完整，视觉展示最强；需要先确认图片生成和评估的服务接入。
3. 经营数据助手：最能体现工具、结构化数据和图表；先准备一套小而一致的模拟经营数据。

如果追求最快扩出一个资料完整的纯聊天案例，则优先考虑 Contoso 零售助手。

业务资料、模拟数据与 HTTP/MCP 工具放在 Demo Hub；Agent、Prompt、模型、知识库和执行仍由现有 Agent Studio 管理。此处仅建议可复用的场景和素材，不要求引入这些项目的全部运行时。

**检索快照**

已核对的主要源码版本：

| 仓库 | 版本 |
| --- | --- |
| google/adk-recipes | `9252494a7aaafca8fe4d81a04f15392345a5779b` |
| assafelovic/gpt-researcher | `3582a6841fe7dc801e2a34e34ee408641aea9bce` |
| microsoft/data-formulator | `5477f0e236426dc8f74a498ec400414fba7fbc0f` |
| filip-michalsky/SalesGPT | `7cd1d4f9fae2a5610fac76e1c0edc38a2fafd388` |
| Azure-Samples/contoso-chat | `028921fe3209db3216075d34ced6c109de132533` |
| aws-samples/aws-genai-rfpassistant | `e16f898cb4ec1d0f369f1b6a2778449049839132` |

其他项目按当日 main 分支核验。文中的 main 链接方便继续浏览，未来内容可能随上游变动。
