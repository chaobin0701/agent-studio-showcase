// Editorial overview of the current source, not a list of enabled deployment features.
export const platformStack = [
  ["管理与聊天端", "Vue 3 · Vben Admin · Element Plus · Vite", "管理后台与中性聊天端分开，共用 packages/chat-ui 的会话组件。"],
  ["API 与领域服务", "Node.js · TypeScript · NestJS · Express", "管理资源、接入鉴权与统一执行服务；Drizzle ORM 维护数据访问。"],
  ["Agent 执行", "Deep Agents · LangChain · LangGraph", "原生执行循环负责模型与能力调度，平台统一控制授权、版本和预算。"],
  ["数据与异步任务", "PostgreSQL · pgvector · pg-boss", "资源与运行记录落库，向量检索和文档任务共用 PostgreSQL 基础设施。"],
  ["模型与工具接入", "ChatOpenAI SDK · HTTP · MCP SDK", "模型供应商适配和外部能力统一接入，业务系统保留自己的数据。"],
  ["追踪与交付", "OpenTelemetry · OpenInference · Docker Compose", "可选本地 Phoenix 追踪；API、Worker 与数据库独立部署。"],
] as const;

export const platformOutline = [
  { title: "工作区、权限与资源边界", summary: "先把谁能配置、谁能调用，以及数据属于谁说清楚。", points: ["工作区隔离、资源访问权限与接入应用各司其职。", "管理鉴权和访客接入分离，平台凭据不进入浏览器。"] },
  { title: "模型接入与 Prompt 版本", summary: "把模型连接、生成参数与提示词变成可追溯的配置。", points: ["供应商、部署与模型方案分别管理；Prompt 支持变量预览、差异审阅和发布。", "发布版本不可修改，请求固定实际使用的资源版本，历史记录不随草稿变化。"] },
  { title: "Agent 执行与 Skills", summary: "用原生框架组织任务，不再叠加第二套通用执行循环。", points: ["Deep Agents 负责通用执行，LangChain 提供模型、消息与工具抽象，LangGraph 提供底层运行能力。", "Skill 正文与辅助资料按发布版本挂载为只读虚拟文件；成员 Agent 使用各自授权的模型与能力。"] },
  { title: "HTTP 工具与 MCP 目录", summary: "工具是能力，HTTP 与 MCP 是接入方式。", points: ["工具使用明确的参数 Schema，运行前校验作用域、资源状态与预算。", "MCP 连接、工具发现与授权分开；发现新工具不会自动授予 Agent。"] },
  { title: "知识库与 RAG 检索", summary: "从上传原文到引用证据，打通资料进入回答的过程。", points: ["Markdown、PDF、DOCX 经过 Worker 解析、普通或父子分块，再构建索引版本。", "支持全文、向量与混合检索；校验向量空间兼容性，多库召回以 RRF 按排名融合。"] },
  { title: "统一 Run 与流式对话", summary: "把任务运行和聊天入口分开，让同一个 Agent 能接入不同应用。", points: ["执行服务统一处理运行身份、超时、次数与 Token 预算，边缘适配负责会话与 SSE。", "请求标识用于幂等恢复；停止接收不等于取消执行，只有完成事件确认本轮结束。"] },
  { title: "追踪、用量与评估", summary: "既看结果，也能追到本次调用了什么。", points: ["Run / Trace 关联资源版本、工具调用、知识引用、状态与用量；关键管理操作保留审计。", "可选本地 Phoenix 接收脱敏元数据；评估脚本与确定性测试覆盖执行和隔离边界。"] },
  { title: "部署与业务系统集成", summary: "平台管理通用能力，业务系统管理领域数据。", points: ["Docker Compose 装配 API、Worker、PostgreSQL 与入口代理，数据库迁移独立执行。", "应用通过 API 接入已发布 Agent，商品、订单等场景能力通过 HTTP / MCP 提供。"] },
] as const;

export const contosoTools = [
  ["contoso_search_products", "按中文名称、人民币预算与人数筛选装备。"],
  ["contoso_get_product", "读取单件商品的完整规格与说明页。"],
  ["contoso_compare_products", "比较 2–4 件装备的价格和规格。"],
  ["contoso_list_customers", "列出可选择的 12 位模拟客户。"],
  ["contoso_get_customer", "读取当前模拟客户与会员标签。"],
  ["contoso_get_orders", "查询 2023 年购买记录与人民币金额汇总。"],
] as const;

export const robotTools = [
  ["list_demo_users", "列出公开的模拟家庭。"],
  ["get_user_id", "确认页面选定的模拟角色。"],
  ["get_user_location", "查询该角色的模拟城市。"],
  ["get_current_month", "确认选中的示例月份。"],
  ["get_weather", "查询固定天气样本。"],
  ["fetch_external_data", "读取家庭清洁使用记录。"],
  ["fill_context_for_report", "提供清洁报告需要的栏目与上下文。"],
] as const;
