# Contoso Outdoor 接入记录

更新日期：2026-10-19。入口：[介绍页与商品目录](http://127.0.0.1:3300/projects/contoso-outdoor)、[聊天体验](http://127.0.0.1:3300/chat/contoso-outdoor)。

这是一个独立的“户外装备顾问” Demo，选购比较、使用说明、模拟购买记录与搭配建议属于同一位助手的能力。聊天推荐问题混合展示选购、说明书与购买记录，每次显示三题，桌面一行三列，可通过“换一组”轮换；点击问题填入输入框，不自动发送。客户切换开始新对话，旧会话保留。

## 资料和功能

- 20 件中文模拟商品，采用独立人民币模拟价格；按预算、分类和帐篷人数进行确定性筛选。
- 20 份中文商品说明书，使用与保养问题通过 Agent Studio 知识库检索，并返回来源引用。商品页可核对与知识库相同的中文内容，原始英文资料在来源目录保留。
- 12 位中文名称虚构客户、32 条 2023 年模拟购买记录；去掉无关样例联系信息，将会员 `nan` 归一为未知，日期转为 ISO 并按时间排序。
- 订单工具返回小而完整的购买事实与计算汇总，商品详细规格通过商品工具获取。对比工具保留完整技术规格，不把摘要中省略的字段当作原始资料缺失。
- 没有真实下单、库存、物流、退款或会员折扣能力。页面、工具和 Prompt 都标明模拟范围。

来源为 [Azure-Samples/contoso-chat](https://github.com/Azure-Samples/contoso-chat)，固定版本 `028921fe3209db3216075d34ced6c109de132533`，MIT 许可保存在 `licenses/contoso-chat.txt`。原始商品 CSV、参考 Prompty 和 20 份原说明书均保留；校验和及规范化说明见 `data/contoso/provenance.json`。

说明书上传到知识库时，把原先通用的顶层标题替换为“准确商品名 + 商品ID”，正文采用独立中文翻译改编层，名称、规格、人民币价格与工具数据一致。这样每个分段的标题路径都带有商品归属，避免同类帐篷的搭建章节混入或漏检。站点保存的原始说明书未修改。

## 当前 Agent Studio 配置

| 资源 | 当前值 |
| --- | --- |
| 工作空间 | 4 |
| Agent | 19：Contoso Outdoor · 户外装备顾问 |
| 当前发布版本 | 38 |
| 系统 Prompt 版本 | 12；源码 `docs/contoso-agent-prompt.txt` |
| 对话模型方案版本 | 9；复用现有已发布方案 |
| 向量模型方案版本 | 14；复用现有已发布方案 |
| 知识库 | 9：Contoso Outdoor · 中文说明书（人民币模拟资料），附语料哈希 |
| 知识库当前索引 | 12；20 份中文文档、326 个分段，均已就绪 |
| HTTP 工具 | 6 个，资源 13–18、发布版本 31–36 |
| MCP 服务 | 2；已发现目录版本 5，含相同 6 个工具 |
| API 应用 | `f5001318-f48f-4ce9-b27c-71167e746f16` |
| 应用范围 | API 启用；Website 关闭；allowedOrigins 为空；密钥仅在本站服务端 |
| 工具凭证 | 独立加密凭证 2；令牌仅在服务端与平台凭证管理中 |

Agent 实际绑定 6 个 HTTP 工具；MCP 提供同一领域服务的另一种接入方式，已验证逐工具结果一致。普通启动、构建和单元测试不会创建或发布这些平台资源。

原机器人 Agent 5 的当前版本仍为 12，原有模型、知识库和接入没有被替换。Contoso 较早版本与初始知识库 6 保留，当前接入使用上述版本 38 与中文知识库 9；原英文知识库 7 与 Agent 版本 30 也保留。

## 工具契约

户外工具使用独立的 `CONTOSO_TOOL_API_TOKEN`，HTTP/MCP 均通过 Bearer 认证。机器人令牌不能调用户外工具，带有不允许 Origin 的请求会被拒绝。所有工具只读。

```text
GET /api/contoso/tools/contoso_search_products?category=Tents&max_price=2000&min_capacity=4
GET /api/contoso/tools/contoso_get_product?product_id=1
GET /api/contoso/tools/contoso_compare_products?product_ids=1,15
GET /api/contoso/tools/contoso_list_customers
GET /api/contoso/tools/contoso_get_customer?customer_id=1
GET /api/contoso/tools/contoso_get_orders?customer_id=1
POST /api/contoso/mcp
GET /api/contoso/openapi
```

`lib/contoso/service.ts` 管理样例领域数据；`lib/contoso/tools.ts` 管理参数校验与行为；HTTP 与 MCP 共享它们。`/api/hub/contoso` 只提供公开模拟数据供页面查看，不提供密钥。20 件商品汇总在 `/projects/contoso-outdoor#catalog`；中文说明书由 Agent Studio 知识库检索。

中文覆盖层位于 `data/contoso/zh-CN/`，按稳定 ID 映射商品、品牌、客户和说明书，独立于来源导入流程，重导入不会覆盖中文内容。订单保留 ID、数量、商品关联及日期；单价、每笔金额和总额从人民币定价表生成。规格保留原始数字与单位含义，价格字段统一为人民币模拟价格。

订单汇总采用 `summary.totalAmount` 和 `summary.currency="CNY"`；原 `totalUSD` 字段已停用。工具名称及入参保持不变，预算单位改为人民币，调用方需同步切换。

本站的 `contoso-1` 至 `contoso-12` 是模拟背景标识。平台访客身份在服务端按“访客 + Demo + 模拟背景”派生，不能由浏览器指定平台 userId。历史、删除和请求恢复均按所属 Demo 选择独立应用密钥；机器人旧别名的原始平台身份仍保留。

## 可复现操作

重新导入固定版本公开资料：

```sh
python3 scripts/import-contoso.py
```

这只获取明列的公开 CSV、JSON、Markdown、Prompty 和 LICENSE，不读取上游环境文件、不连接上游数据库。Python 仅用于离线资料导入，运行中的站点与工具服务仍是 Node.js。

显式配置平台资源，需要当前进程的管理员凭据；运行会创建、测试并发布资源与接入：

```sh
DEMO_ADMIN_PASSWORD='<本机管理员密码>' npx tsx scripts/connect-contoso.ts --apply
```

只准备知识库与 Prompt 可使用 `--prepare`。运行状态保存在忽略目录 `.data/contoso-connection/`；重复运行复用已有资源和任务。说明书索引未完成时观察原任务，不因为等待而重新创建同一任务。Prompt 内容变化通过平台版本接口发布，Agent 通过草稿和测试后切换版本。

本站 `.env.local` 仅增加三个独立服务端值：

```text
AGENT_STUDIO_CONTOSO_AGENT_ID
AGENT_STUDIO_CONTOSO_API_KEY
CONTOSO_TOOL_API_TOKEN
```

真实模型验证必须显式调用：

```sh
CONTOSO_VERIFICATION_TAG=current npx tsx scripts/verify-contoso-live.ts
```

相同验证标签保留请求投递标识与已完成结果。需要执行新一轮模型测试时使用新标签；不把已有结果回放当作新的模型运行。只验证实时工具传输可使用 `--tools-only`。

只读检查平台实际状态：

```sh
DEMO_ADMIN_PASSWORD='<本机管理员密码>' npx tsx scripts/audit-contoso.ts
```

## 验证记录

本轮已完成：

- 本地 14 项测试：源数据一致性、预算与人数硬约束、零结果、参数校验、规范化标题、推荐问题刷新、跨 Demo 凭证选择，以及旧会话身份、流式投递和幂等恢复。
- TypeScript 检查与 Next.js 生产构建通过，包含 20 个商品说明页。
- 6 个户外工具的真实 HTTP/MCP 结果一致；未授权、错误领域令牌和跨 Origin 请求均被拒绝。
- 5 个真实模型场景通过：选购、同一会话内追问搭建说明并引用对应说明书、订单总额与件数、零匹配条件、另一位模拟客户的订单查询。
- 真实模型已验证：四人预算 2,000 元匹配远行者 X4 四人帐篷（¥1,699）；张晨的三笔模拟记录汇总 ¥8,595、5 件；王浩汇总 ¥2,346。
- 原机器人 7 工具 HTTP/MCP 一致性，以及报告、天气、知识问答三个真实模型场景回归通过。
- 浏览器检查：每个 Demo 仅三个分类，每次三题、桌面一行三列；刷新推荐保留草稿且不创建对话；手机为单列，展示当前分类三题且没有横向溢出；商品页可读取完整说明书。
- 只读平台审计确认 Agent、Prompt、全部工具都已发布，知识库 20 份当前文档均在生效索引内，MCP 目录和应用范围符合配置；原始说明书校验和一致。

模型与传输证据保存在忽略目录 `output/verification/contoso-live.json`；平台审计为 `output/verification/contoso-platform.json`；原机器人回归为 `output/verification/live.json`。浏览器截图在 `output/playwright/`。这些运行结果、会话令牌与截图不提交到仓库。

中文化迁移保留历史会话正文和已保存请求体。旧英文名称或美元消息保持原样；后续回答查询当前 CNY 工具资料。回退 Agent 版本时需同时恢复对应的数据服务版本，避免旧 USD Prompt 与新 CNY 数据混用。
