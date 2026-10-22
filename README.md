# Agent Studio Showcase

[在线体验](https://hexu.7410000.xyz/) · [平台核心源码 (Agent Studio)](https://github.com/chaobin0701/agent-studio) · [系统实现与架构](#系统实现与技术架构)

**Agent Studio Showcase** 是基于 Next.js 与 React 构建的官方产品官网与业务场景演示站。作为 [Agent Studio](https://github.com/chaobin0701/agent-studio) 通用智能体平台的配套前台，它既是对外展示平台定位、技术架构与核心亮点的门户，也是检验智能体落地能力的真实体验场。

平台核心负责 Agent 编排、模型调度、版本流转与权限控制；展示站则负责提供贴近真实业务的交互界面，并通过标准化的 HTTP 与 MCP 工具向平台输出模拟领域数据，实现“平台通用、业务解耦”的设计初衷。

---

## 核心展示场景

展示站内置了两个具有代表性的垂直业务场景，验证智能体在不同任务复杂度下的执行表现：

### 1. 扫地机器人智能助理 (Robot Assistant)
* **场景定位**：智能硬件售后与家庭清洁顾问。
* **多能力融合**：在同一段对话中无缝衔接**知识库排障问答**（设备常见故障与使用指南）、**清洁报告生成**（结合指定家庭历史运行数据进行结构化分析）以及**拖地建议**（读取家庭所在城市的天气状况输出生活提示），用户无需手动切换不同模式。
* **数据与模拟**：内置 10 组家庭模拟档案与 12 个历史月份运行数据，支持在界面中切换不同家庭与月份进行多维度验证。

### 2. 户外装备顾问 (Contoso Outdoor)
* **场景定位**：专业零售导购与装备使用咨询（参考微软 Contoso Chat 业务模型深度重构）。
* **知识与目录**：提供 20 件户外装备的中文参数规格、20 份装备使用说明书，以及 12 位中文客户档案与历史购买记录（采用统一的人民币模拟价格）。
* **人机协作与审批**：
  * **意图澄清 (`ask_user`)**：当用户提问模糊或存在多项选择（如选购预算、出行人数）时，Agent 自动发起交互式提问，前端呈现单选选项与自由补充输入框。
  * **操作审批**：当 Agent 尝试调取涉及隐私的历史购买记录等敏感工具时，触发审批机制，用户确认后才执行真实工具调用。

---

## 系统实现与技术架构

Showcase 采用前后端一体的轻量化架构，重点解决现代 AI 应用在体验流畅度、安全性以及架构解耦上的挑战：

```text
┌────────────────────────────────────────────────────────┐
│               Agent Studio Showcase                    │
│                                                        │
│  ┌──────────────────────┐    ┌──────────────────────┐  │
│  │   现代化聊天交互界面   │    │  独立领域服务 (Mock)   │  │
│  │   (React 19 / UI)    │    │  (商品/用户/天气/记录) │  │
│  └──────────┬───────────┘    └──────────┬───────────┘  │
│             │                           ▲              │
│    SSE 消息 / 交互卡片                   │ HTTP / MCP   │
│             ▼                           │ 工具调用     │
│  ┌──────────────────────┐               │              │
│  │  轻量服务端代理与鉴权  │               │              │
│  │  (Next.js App Router)│               │              │
│  └──────────┬───────────┘               │              │
└─────────────┼───────────────────────────┼──────────────┘
              │ 签发访客凭证 / 中继对话      │
              ▼                           │
┌─────────────────────────────────────────┴──────────────┐
│                  Agent Studio 平台核心                  │
│                                                        │
│  • Agent 执行循环 (ReAct / Deep Agents)                 │
│  • 知识库混合检索 (Hybrid RAG)                          │
│  • 工具编排、版本管理与执行审计                          │
└────────────────────────────────────────────────────────┘
```

### 1. 现代化的交互界面实现
* **技术基座**：采用 **Next.js 16 (App Router)**、**React 19**、**TypeScript** 与 **Tailwind CSS**，结合 Radix UI 与 Framer Motion 构建细腻的交互微动画与沉浸式暗色/亮色自适应界面。
* **对话与内容渲染**：支持 Markdown 格式化、代码高亮、长文本自动滚动锚定与停止生成控制。
* **上下文容量指示器**：在输入框附近集成圆形进度环，实时计算并直观展示当前对话在模型窗口中的 Token 占用与剩余额度。
* **推荐追问与预填**：解析服务端返回的结构化推荐追问（`suggestedFollowUps`），首条建议自动融入输入框占位提示，支持快捷键 Tab/Enter 一键发送或点击填入草稿。

### 2. 业务与平台彻底解耦
* 业务数据（商品明细、清洁日志、天气信息）由 Showcase 服务端直接提供，没有侵入式写入 Agent Studio 核心系统。
* Showcase 统一暴露只读的 **HTTP 接口**与符合规范的 **MCP (Model Context Protocol) 端点**，由 Agent Studio 在后台以标准工具的形式挂载，保证平台内核的高度通用性。

### 3. 会话隔离与服务端安全代理
* **凭据隔离**：客户端浏览器不直接接触 Agent Studio 平台 API Key，所有对话请求经由 Showcase 服务端进行安全中继。
* **访客身份控制**：基于 HttpOnly 签名 Cookie 派生独立访客身份，实现不同访客、不同 Demo 和不同模拟家庭之间的数据与会话完全隔离。
* **断流与幂等重放**：客户端记录投递状态与请求标识，收到完整结束信号前支持幂等重连与状态恢复，避免重复生成回答。

### 4. 人机协作闭环 (Human-in-the-Loop)
* 当 Agent Studio 检测到需要用户介入（`interaction_required`）时，后端中断当前执行流并下发交互协议。
* Showcase 前台即时接管输入区域，动态渲染结构化选项卡片或敏感工具审批面板。
* 用户提交选择或跳过操作后，Showcase 恢复原执行任务；已处理的历史交互自动折叠收纳在工具调用时间线内。

---

## 快速开始

### 环境依赖
* **Node.js**：`>= 24.12.0`
* **Agent Studio**：需配合运行中的 [Agent Studio](https://github.com/chaobin0701/agent-studio) 平台提供对话与知识检索服务（本地开发默认连接 `http://127.0.0.1:3020`）。

### 本地启动

1. **安装依赖**：
   ```sh
   npm install
   ```

2. **初始化环境配置**：
   ```sh
   node scripts/setup.mjs
   ```
   *该脚本会在不存在时生成独立的 `.env.local` 文件，已有配置会被保留。*

3. **启动开发服务**：
   ```sh
   npm run dev
   ```
   默认启动在 `http://127.0.0.1:3300/`。

4. **常用验证指令**：
   ```sh
   npm run typecheck    # TypeScript 类型校验
   npm test             # 单元与集成测试（不依赖外部模型）
   npm run build        # Next.js 生产环境构建
   npm start            # 生产模式本地运行
   ```

---

## 环境变量配置

所有配置项均维护在独立的 `.env.local` 中，与平台环境彻底隔离：

| 环境变量 | 必填 | 默认值 | 说明 |
| :--- | :---: | :--- | :--- |
| `SITE_ORIGIN` | 是 | `http://127.0.0.1:3300` | 展示站完整公网/本地 Origin |
| `SESSION_SECRET` | 是 | 随机字符串 | 匿名访客签名密钥，更换会导致访客历史丢失 |
| `TOOL_API_TOKEN` | 是 | - | 扫地机器人 HTTP / MCP 工具的认证 Bearer Token |
| `AGENT_STUDIO_BASE_URL` | 是 | `http://127.0.0.1:3020/api` | Agent Studio 平台公开 API 地址 |
| `AGENT_STUDIO_AGENT_ID` | 是 | - | 接入的扫地机器人 Agent 资源 ID |
| `AGENT_STUDIO_API_KEY` | 是 | - | 扫地机器人应用的服务端接入密钥 |
| `CONTOSO_TOOL_API_TOKEN` | 是 | - | 户外装备 HTTP / MCP 工具的独立认证令牌 |
| `AGENT_STUDIO_CONTOSO_AGENT_ID` | 是 | - | 接入的户外装备顾问 Agent 资源 ID |
| `AGENT_STUDIO_CONTOSO_API_KEY` | 是 | - | 户外装备应用的服务端接入密钥 |
| `HUB_DATA_DIR` | 否 | `.data` | 本站轻量会话与路由数据目录 |

---

## 接口与业务数据暴露

展示站内置的领域数据服务对外提供只读查询接口，供 Agent Studio 的 Tool / MCP 模块调用（均需 `Authorization: Bearer <TOKEN>`）：

### 扫地机器人工具端点
* `GET /api/tools/list_demo_users`：获取模拟家庭列表
* `GET /api/tools/get_user_id?user_id=1003`：查询家庭基础信息
* `GET /api/tools/get_user_location?user_id=1003`：查询所在城市
* `GET /api/tools/get_weather?city=杭州`：获取指定城市的模拟天气状况
* `GET /api/tools/fetch_external_data?user_id=1003&month=2025-12`：拉取指定月份清洁与耗材记录
* `POST /api/mcp`：以 Streamable HTTP 协议暴露上述工具集供 MCP 客户端直接发现和挂载

### 户外装备顾问端点
* `GET /api/contoso/tools/search_products`：多维度搜索户外装备目录
* `GET /api/contoso/tools/get_product`：读取特定装备的详细参数
* `GET /api/contoso/tools/get_customer_profile`：获取模拟客户档案
* `GET /api/contoso/tools/list_customer_orders`：获取模拟客户的购买历史记录
* `POST /api/contoso/mcp`：提供符合 MCP 协议的户外装备工具目录

---

## 验证与测试

* **自动化测试 (`npm test`)**：基于 Node.js 原生测试套件与临时隔离目录，严格校验领域数据语义、参数边界防御、UTF-8 / SSE 协议分包解析、访客会话隔离、提问与审批交互状态机以及流式断流恢复，无需消耗实际模型 Token。
* **端到端线上验收 (`scripts/verify-live.ts`)**：连接运行中的 Agent Studio 进行真实端到端对话回归测试，验证工具发现、意图推理、知识库召回和历史记录闭环。

---

## 来源与第三方许可

* 完整来源提交、复用路径与修改说明参见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
* 本项目原创代码采用 [MIT 许可证](LICENSE) 开源；引入的开源组件、样例数据与第三方图标资源均保留其原版权声明与许可。
