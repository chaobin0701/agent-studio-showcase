// Editorial overview of the current source, not a list of enabled deployment features.
export const platformStack = [
  ["管理与聊天端", "Vue 3 · Element Plus · Vite", "管理端配置并发布平台资源；中性聊天端复用 packages/chat-ui 的会话组件。"],
  ["API 与服务端", "Node.js · TypeScript · NestJS · Express", "管理资源、接入鉴权与统一执行服务；Drizzle ORM 维护数据访问。"],
  ["Agent 执行", "Deep Agents · LangChain · LangGraph", "原生执行循环负责模型与能力调度，平台统一控制授权、版本和预算。"],
  ["数据与异步任务", "PostgreSQL · pgvector · pg-boss", "资源与运行记录落库，向量检索和文档任务共用 PostgreSQL 基础设施。"],
  ["模型与工具接入", "ChatOpenAI SDK · HTTP · MCP SDK", "模型供应商适配和外部能力统一接入，业务系统保留自己的数据。"],
  ["追踪与交付", "OpenTelemetry · OpenInference · Docker Compose", "可选本地 Phoenix 追踪；API、Worker 与数据库独立部署。"],
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
  ["get_current_month", "读取当前月份与可用示例月份。"],
  ["get_weather", "查询固定天气样本。"],
  ["fetch_external_data", "读取家庭清洁使用记录。"],
  ["fill_context_for_report", "提供清洁报告需要的栏目与上下文。"],
] as const;
