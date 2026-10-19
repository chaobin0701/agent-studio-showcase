# 展示站页面结构与 AI 素材

## 页面结构

- 首页：平台介绍、纯图片架构轮播、两张应用体验卡片。删除“继续探索”区块及卡片内重复说明。
- 体验卡片：“开始聊天”进入对应聊天；“查看详情”和卡片空白处进入对应项目详情，使用展开链接，避免嵌套链接。
- 平台详情：工作原理、真实技术栈、八个可展开的大纲章节，以及缩小的应用入口。
- 场景详情：工作原理、数据与模拟角色、领域工具、HTTP/MCP 和技术实现；首屏与目录栏提供直接聊天入口。
- 聊天：侧栏名称弹窗切换体验；头像、顶部姓名和输入框姓名查看、切换角色。草稿按体验存储，会话维持访客、体验和角色隔离。

平台大纲组织参考 https://liwenzhou.com/courses/ai-agent/ ，内容依据 Agent Studio 当前源码与工程文档整理。主服务部署与当前源码的区别在平台详情注明；未将参考课程的技术栈、A2A 或 Sandbox 等内容写成本项目能力。

## 正式 AI 图片

使用内置 image_gen 工具；未使用 CLI、SVG 或程序绘制正式架构图片。三张图均为 1448 × 1086 PNG。首先生成平台架构图，再以它作为参照生成两个同风格衍生面板。蓝白色、磨砂玻璃与陶瓷、轻等距透视、字体与连线保持一致。图片描述代码架构，不是后台真实状态截图。

保存路径（相对本项目根目录）：

- `public/images/studio/architecture-ai-v2.png`：整体架构；首页与平台详情使用。通过 AI 编辑补正 Agent 到 HTTP/MCP 的连线。
- `public/images/studio/execution-ai.png`：对话执行链路。
- `public/images/studio/knowledge-pipeline-ai.png`：文档到知识检索的链路。

`public/images/studio/architecture-ai.png` 保留为原始生成图及另两张图的风格参照。

Next Image 按视口生成响应式资源；原图链接可查看完整尺寸。轮播仅展示图片，支持鼠标拖动、触屏滑动、键盘左右切换；不自动切换，不显示说明、按钮或指示条，尊重减少动态效果设置。其他页面使用的图标与第三方原有 SVG 不属于本轮图片替换。

## 最终生成提示词

### 1. 平台架构

```text
Use case: infographic-diagram.
Asset type: final raster hero artwork for the Agent Studio Chinese developer platform website, also usable as a larger architecture illustration on its project page.
Create ONE exquisite architecture infographic. Landscape 4:3 canvas, preferably 1536 x 1152. This is a real technical architecture with meaningful labeled nodes and correct connectors, not an abstract network, not a screenshot or dashboard mockup.
Visual system for a coherent three-image series: luminous cool white / very pale ice-blue background, cobalt blue #006BFF accents, deep navy typography. Elegant lightly isometric architectural modules with subtle frosted-glass and matte porcelain surfaces, refined soft daylight shadows, restrained depth, crisp hairline blue connectors with arrowheads. Editorial quality, calm premium developer product art, extremely precise layout, generous whitespace. Flat readable labels on the modules, no exaggerated perspective. Artwork fills canvas without an enclosing browser frame. No floating dashboard overlay.
Composition: a bold but restrained Agent Studio title near upper left, a short Chinese subtitle "平台架构". Four clearly spaced tiers connected top to bottom. Top tier two modules: "管理后台" with small label "Vue · Vben", and "应用与聊天" with small label "API · SSE". Second tier one strong cobalt module across the center: "NestJS API", with small text "工作区 · 资源 · 版本 · 鉴权". Third tier two modules: larger "Deep Agents" small text "LangChain · LangGraph", and smaller "Worker" small text "文档处理 · pg-boss". Bottom tier three distinct modules: "模型服务", "PostgreSQL" with smaller "pgvector", and "HTTP / MCP" with smaller "外部业务".
Connect top modules into API, API into execution and Worker, execution to model/database/external tools, Worker to PostgreSQL. This should clearly communicate a complete platform with external business data boundaries.
Text: use exactly the labels above, typeset accurately and beautifully, Chinese and Latin text crisp and readable. No paragraphs, no slogans, no additional architecture components, no Redis, no A2A, no Kubernetes. No captions below the artwork, no carousel controls, no badges or watermark. This visual should feel far more crafted and immersive than a plain SVG diagram while remaining a comprehensible software architecture.
```

### 2. 对话执行

参照图：`public/images/studio/architecture-ai.png`。

```text
Use case: infographic-diagram. Edit the provided raster architecture artwork into a companion panel of the SAME Agent Studio series. Preserve the exact art direction: luminous cool white/ice-blue background, cobalt #006BFF, navy crisp typography, frosted glass and matte porcelain modules, lightly isometric placement, refined soft daylight shadows, consistent thin rounded blue connectors, same label hierarchy and same generous margins. Landscape 4:3 canvas, same resolution and styling as the reference. Keep the Agent Studio brand in the upper left in the exact same typographic treatment, with a short Chinese subtitle beneath it. Replace the architecture modules with the subject below. The image itself is the entire artwork: no enclosing browser/dashboard frame, no carousel controls, no caption underneath, no decorative text paragraphs, no watermark. Render Chinese and English labels exactly, readable, with correct spelling. Keep these diagrams clear and beautiful, avoid cramming in tiny annotations.
Subject: "对话执行". Show a coherent directed agent execution journey. At top, a compact user conversation/request module labeled "用户请求", a connector into a gate labeled "鉴权与版本快照". Then a dominant cobalt central orchestration block labeled "Deep Agents", sublabel "模型决策 · 能力授权", with a small refined white robot symbol standing on its frosted-glass platform, matching the reference. Beneath it, three balanced capability platforms connected FROM Deep Agents: "模型服务", "知识检索", and "HTTP / MCP". Include a tasteful curved return connector from tool capability back toward the central orchestrator to communicate iterative tool use. At the bottom, the flow converges into a final response module labeled "答案与引用", with small label "SSE · 公开过程 · Run / Trace". The diagram must communicate the user request enters authenticated fixed configuration, then the agent decides which capabilities to call, then returns a grounded answer. Do not imply a required RAG call for every question; capability paths are optional. Use just the specified labels, no other text. Make this a newly composed companion illustration, not a crop of the reference.
```

### 3. 知识检索

参照图：`public/images/studio/architecture-ai.png`。

```text
Use case: infographic-diagram. Edit the provided raster architecture artwork into a companion panel of the SAME Agent Studio series. Preserve the exact art direction: luminous cool white/ice-blue background, cobalt #006BFF, navy crisp typography, frosted glass and matte porcelain modules, lightly isometric placement, refined soft daylight shadows, consistent thin rounded blue connectors, same label hierarchy and same generous margins. Landscape 4:3 canvas, same resolution and styling as the reference. Keep the Agent Studio brand in the upper left in the exact same typographic treatment, with a short Chinese subtitle beneath it. Replace the architecture modules with the subject below. The image itself is the entire artwork: no enclosing browser/dashboard frame, no carousel controls, no caption underneath, no decorative text paragraphs, no watermark. Render Chinese and English labels exactly, readable, with correct spelling. Keep these diagrams clear and beautiful, avoid cramming in tiny annotations.
Subject: "知识检索". Show a coherent document-to-evidence pipeline rather than a generic book sculpture. Top module: a small bundle of precisely rendered white documents labeled "文档资料", sublabel "Markdown · PDF · DOCX". Connector to a wide cobalt processing platform labeled "Worker", sublabel "解析 · 分块 · 索引版本", with a refined white-and-blue gear symbol matching the reference Worker. Split into two clear parallel platforms: "全文索引" with a subtle text/document symbol, and "向量索引" sublabel "pgvector" with a blue database and dot constellation symbol. Both connect into a lower fusion platform labeled "混合检索" sublabel "RRF · 按排名融合". At the bottom a compact white evidence/document output labeled "上下文与引用". Preserve ample whitespace and logical top-to-bottom arrows. The text must be exactly the concise specified labels, no equations, no claims of reranking or real time sync. Match the reference's camera, materials, typography and palette so both look like one carefully art-directed set.
```

既有 `agents.png`、`knowledge.png`、`tools.png` 为此前视觉素材，当前轮播不再使用。Solid、Zola 与业务样例的原始许可保持不变。

### 4. 整体架构连线校正

输入：`public/images/studio/architecture-ai.png`；输出：`public/images/studio/architecture-ai-v2.png`。仅增加 Deep Agents 到 HTTP/MCP 的可见连线，保留原图风格、文字和布局。

```text
Use case: precise-object-edit, technical infographic correction.
Edit ONLY ONE connector in this provided Agent Studio architecture illustration. Preserve absolutely all current text, typography, objects, labels, layout, 1448x1086 canvas, colors, pale white-blue frosted glass/porcelain materials, lighting and geometry.
The bottom-right platform labeled "HTTP / MCP" / "外部业务" is currently visually disconnected. Add one clearly visible thin cobalt-blue directed connector FROM the "Deep Agents" execution platform TO the bottom-right HTTP / MCP cloud platform. The arrowhead must terminate directly at the HTTP / MCP platform or cloud, unambiguously connecting the execution agent to its external business tools. Route the connector cleanly through free whitespace, using a subtle crossover bridge if needed to avoid confusing it with the Worker-to-PostgreSQL connection. Keep all existing valid connectors, including Worker to PostgreSQL and Agent to model/database. Do not connect Worker to HTTP/MCP instead. No new node, no extra text, no new UI elements. This is a surgical correction of a single architecture line, not a redesign.
```
