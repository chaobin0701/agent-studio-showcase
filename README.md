# Demo Hub

独立的 React / Node.js 项目展示站。官网采用 **Solid Free**，聊天复用 **Zola** 的对话、输入、消息、Markdown 与滚动组件。Agent Studio 作为可替换的后端适配器，通过公开 API 接入。

Agent Studio 平台源码：[chaobin0701/agent-studio](https://github.com/chaobin0701/agent-studio)。

## 本地体验

- 首页：<http://127.0.0.1:3300/>
- 扫地机器人应用介绍：<http://127.0.0.1:3300/projects/robot-lab>
- 扫地机器人聊天：<http://127.0.0.1:3300/chat/robot-assistant>
- 户外装备顾问介绍与商品目录：<http://127.0.0.1:3300/projects/contoso-outdoor>
- 户外顾问聊天：<http://127.0.0.1:3300/chat/contoso-outdoor>
- 数据与工具：<http://127.0.0.1:3300/tools>
- OpenAPI：<http://127.0.0.1:3300/api/openapi>

知识问答、清洁报告与天气建议属于同一个 Demo，聊天不需要切换模式。推荐问题混合展示三种能力，每次显示三条，桌面为一行三列；点击“换一组”轮换问题，选中问题只填入当前输入框。

Contoso Outdoor 是另一个独立 Demo，包含选购比较、说明书问答、模拟购买记录与搭配建议。提供 20 件样例商品、20 份中文说明书、12 位中文名称虚构客户和 32 条 2023 年购买记录；采用独立人民币模拟价格，2023 年模拟订单金额按该定价重算；英文原始资料保留。说明书由 Agent Studio 知识库检索，商品和购买记录通过只读工具查询。接入详情见 [docs/contoso-integration.md](docs/contoso-integration.md)。

聊天右上角的数据按钮可切换 **10 个模拟家庭、12 个示例月份**。换家庭或月份时开始新对话，旧会话保留。使用记录来自参考项目的 120 条公开样本，原始日期为 **2025 年**；天气是固定样本，非实时天气。AI 回答来自真实 Agent 调用。

## 启动

需要 Node.js 24.12 或更高版本。本站不依赖 Docker 或 Supabase；只有接入的 Agent Studio 使用其独立数据库。

```sh
npm install
node scripts/setup.mjs
npm run dev
```

`setup` 只在不存在时生成本站独立的 `.env.local`。已经配置过的环境文件会保留。开发默认监听 `127.0.0.1:3300`。

```sh
npm run typecheck
npm test
npm run build
npm start
```

生产部署支持单个 Node 进程或 Next.js standalone；运行时应持久化 `.data/` 并注入环境变量。Cookie 签名密钥应长期保留；更换后匿名访客无法继续访问原有会话。使用 HTTPS 部署时将 `SITE_ORIGIN` 改成精确站点地址，Cookie 自动使用 Secure。

## 聊天适配

配置均在 `.env.local`，不读取 Agent Studio 或其他来源仓库的环境文件、不共享数据库：

| 变量                    | 用途                                          |
| ----------------------- | --------------------------------------------- |
| `SITE_ORIGIN`           | 本站完整 Origin，默认 `http://127.0.0.1:3300` |
| `SESSION_SECRET`        | 本站匿名访客签名                              |
| `TOOL_API_TOKEN`        | HTTP / MCP 工具认证                           |
| `AGENT_STUDIO_BASE_URL` | 后端公开 API 地址，包含 `/api`                |
| `AGENT_STUDIO_AGENT_ID` | 接入的 Agent 资源 ID                          |
| `AGENT_STUDIO_API_KEY`  | 已启用平台应用签发的服务端密钥                |
| `AGENT_STUDIO_CONTOSO_AGENT_ID` | 户外装备顾问独立 Agent ID |
| `AGENT_STUDIO_CONTOSO_API_KEY` | 户外顾问独立应用的服务端接入密钥 |
| `CONTOSO_TOOL_API_TOKEN` | 户外商品 HTTP / MCP 工具的独立令牌 |
| `HUB_DATA_DIR`          | 可选，本站 SQLite 路由数据目录，默认 `.data`  |

当前本机接入：工作空间 4、Agent 5、应用 `8fcc3084-130b-4486-a36d-8d370b74dd71`；已验证的生效版本为 12，原版本 11 保留。没有修改应用启用状态或 Origin。接入密钥仅保存于本站服务端，工具令牌在 Agent Studio 中通过其既有加密凭证管理保存。

`scripts/connect-agent.ts` 是显式运行的本地配置操作：保存原配置、创建接入密钥与工具凭证、真实测试 7 个 HTTP 工具、发现 MCP 契约、发布业务 Prompt 和更新 Agent 工具绑定。**运行会修改并发布本地 Agent 配置**，普通启动与自动测试不会调用它。管理员凭据通过当前进程的 `DEMO_ADMIN_LOGIN` / `DEMO_ADMIN_PASSWORD` 提供，不写入项目文件。

业务 Prompt 见 [docs/robot-agent-prompt.txt](docs/robot-agent-prompt.txt)。报告栏目用普通业务指导与只读工具表达，不复制原 Python 项目的动态提示词中间件或 Agent 执行循环。

`scripts/connect-contoso.ts --apply` 是另一个显式配置入口：导入说明书到知识库并等待索引、发布 Prompt、验证并发布 6 个 HTTP 工具、发现独立 MCP 目录、发布户外 Agent 并创建仅 API 接入的应用与密钥。它复用已发布模型方案，不修改机器人 Agent 或其接入。配置可重跑，实际状态保存在忽略目录 `.data/contoso-connection/`；`--prepare` 只准备知识库与 Prompt。管理员密码仅通过当前进程提供。

`scripts/verify-contoso-live.ts` 会调用真实模型，必须显式运行，不在普通测试中执行。它检查 HTTP/MCP 一致性、凭证与来源、选购、说明书引用、多轮追问、购买记录汇总、无匹配条件、客户及 Demo 隔离，并将结果保存在忽略目录 `output/verification/`。`CONTOSO_VERIFICATION_TAG` 可区分不同轮次的验证投递记录。

## 工具与数据

`lib/robot/service.ts` 是模拟业务数据入口，`lib/robot/tools.ts` 定义共享校验与工具行为。页面、HTTP 与 MCP 共用它们。未来接真实业务系统时，在此服务层替换数据读取，不需要改 Agent Studio 的平台代码。

所有工具只读，通过 `Authorization: Bearer <TOOL_API_TOKEN>` 认证：

```text
GET  /api/tools/list_demo_users
GET  /api/tools/get_user_id?user_id=1003
GET  /api/tools/get_user_location?user_id=1003
GET  /api/tools/get_current_month
GET  /api/tools/get_weather?city=杭州
GET  /api/tools/fetch_external_data?user_id=1003&month=2025-12
GET  /api/tools/fill_context_for_report
POST /api/mcp                           Streamable HTTP，stateless
```

`get_current_month` 区分真实当前月份和样本月份；查询不存在的记录返回 `found=false`。身份、城市和天气保持稳定，不沿用参考项目中的随机选择。`fill_context_for_report` 只返回栏目约定，不改变系统提示词或运行状态。

本地 Agent Studio 按其已有网络策略显式登记 `AGENT_TOOL_ALLOWED_HOSTS=127.0.0.1`，HTTP/MCP 仍使用受限传输、凭证引用、统一工具执行与审计，没有增加业务特权通道。

## 会话与恢复

旧的 `robot-report` / `robot-weather` 链接会转到统一入口，旧会话合并展示在同一个列表中。保留旧会话原始的后端身份与 ID，不重写或合并对话正文。

- 本站保存匿名访客、Demo/模拟家庭、会话路由与投递记录（包含原始提问，用于幂等重放）；不保存助手回答。完整对话历史与执行以 Agent Studio 为准。
- HttpOnly 签名 Cookie 确定访客，平台 `userId` 在服务端派生；不同访客、Demo 和模拟家庭隔离。
- 请求保留原始正文与幂等标识。收到 `done` 才确认完成，断流不会自动重新生成回答。
- **停止接收只停止浏览器显示**，公开 API 不支持取消执行；刷新状态可读取已完成结果。
- 若首轮尚未确认，可点击“恢复原请求”，使用原标识和原正文恢复；该操作可能启动此前未被服务端接受的请求。运行中返回冲突时稍后刷新，不能换标识自动重发。
- 删除会话会删除对应 Agent Studio 历史，界面有确认步骤。

## 验证与回退

`npm test` 使用临时数据和本地模拟传输，验证数据语义、参数边界、UTF-8 / SSE 拆包、会话归属、幂等重放和停止接收后的结果保存，不调用真实模型。

显式执行 `npx tsx scripts/verify-live.ts` 会调用已配置的真实 Agent，验证知识问答、模拟天气和报告三条链路，以及 7 个工具的 HTTP/MCP 一致性、会话隔离和历史恢复。结果在忽略的 `output/verification/live.json`，不会随源码提交。

配置前后记录位于忽略的 `.data/agent-connection/`。回退可在 Agent Studio 管理后台将 Agent 5 切回版本 11；原 Prompt、知识库、模型和 Skill 均保留。若停用本站，可撤销名为 `Demo Hub local server` 的接入密钥，并在工具管理停用本站工具与连接。

## 来源与许可

完整来源提交、复用路径与修改说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)，原始许可在 `licenses/`。此前的模板候选保留在 `docs/style-options.md`，历史草案在 `docs/architecture-draft.md`。

本站原创代码采用 [MIT 许可](LICENSE)；引入的模板、组件、样例数据及其他第三方材料保留其各自许可，见上述来源文件。
