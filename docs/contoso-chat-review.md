# Contoso Chat 源码与迁移评估

核查日期：2026-10-17。上游：[Azure-Samples/contoso-chat](https://github.com/Azure-Samples/contoso-chat)，版本 `028921fe3209db3216075d34ced6c109de132533`。此轮只读取公开源码与样例资料，没有安装应用、调用模型、部署 Azure 服务或修改 Agent Studio。

**判断：适合作为展示站的下一个独立业务 Demo。** 最有价值的是户外用品场景、提示词和完整的模拟资料。接入现有 Demo Hub 与 Agent Studio 比复刻上游 Azure 部署更符合目前项目结构。

**它实际提供什么**

Contoso Outdoor 是虚构的户外用品商店。当前代码通过固定流程读取客户、查找商品、生成个性化回答。

| 资料 | 实际核对结果 | 来源 |
| --- | --- | --- |
| 商品目录 | 20 个商品，字段包括 ID、名称、价格、分类、品牌、描述 | [products.csv](https://github.com/Azure-Samples/contoso-chat/blob/028921fe3209db3216075d34ced6c109de132533/data/product_info/products.csv) |
| 商品说明书 | 20 份 Markdown，包括规格、使用与保养内容 | [manuals](https://github.com/Azure-Samples/contoso-chat/tree/028921fe3209db3216075d34ced6c109de132533/data/manual_info/manuals) |
| 客户资料 | 12 个模拟客户，共 32 条嵌入式订单记录，订单日期均为 2023 年 | [customer_info](https://github.com/Azure-Samples/contoso-chat/tree/028921fe3209db3216075d34ced6c109de132533/data/customer_info) |
| 回答提示词 | 使用检索资料、客户信息、购买记录；要求回答中包含商品 ID | [chat.prompty](https://github.com/Azure-Samples/contoso-chat/blob/028921fe3209db3216075d34ced6c109de132533/src/api/contoso_chat/chat.prompty) |
| 检索提示词 | 将问题扩展为最多 5 条商品搜索查询 | [product.prompty](https://github.com/Azure-Samples/contoso-chat/blob/028921fe3209db3216075d34ced6c109de132533/src/api/contoso_chat/product/product.prompty) |
| 评测资料 | 12 行示例输入，以及连贯性、流畅性、相关性、依据性评测代码 | [evaluators](https://github.com/Azure-Samples/contoso-chat/tree/028921fe3209db3216075d34ced6c109de132533/src/api/evaluators) |

这些资料可以支持商品选购、产品比较、说明书问答和基于历史购买的推荐。订单资料本身没有建立物流跟踪、退款或库存能力；这些属于另行实现的业务功能。

**实际执行流程**

1. 从请求读取客户 ID、问题与聊天历史参数。
2. 从 Cosmos DB 读取客户，取订单数组中的前两条。
3. 通过商品检索提示词扩展查询，计算向量，在 `contoso-products` 索引执行文本、向量与语义检索，并合并去重。
4. 将客户和商品资料填进回答提示词，调用 Azure OpenAI。
5. 返回 `question`、`answer` 和 `context`。

对应源码：[chat_request.py](https://github.com/Azure-Samples/contoso-chat/blob/028921fe3209db3216075d34ced6c109de132533/src/api/contoso_chat/chat_request.py)、[product.py](https://github.com/Azure-Samples/contoso-chat/blob/028921fe3209db3216075d34ced6c109de132533/src/api/contoso_chat/product/product.py)。这是后端安排好的 RAG 流程；当前主链路没有让模型自主选择业务工具的循环。

**接入前需要知道的实际限制**

- 当前 `src` 只有 API 与相关代码，没有完整的顾客聊天前台。主入口 `/` 返回 Hello World，调试依靠 Swagger。现有 Zola 聊天界面可以承接展示。
- `chat_history` 参数虽然被接收，却没有传给 `prompty.execute`；模板里的 `history` 循环没有从主流程得到历史。多轮追问不能直接依赖这个上游实现。
- 说明书已有独立建索引 Notebook，索引名为 `contoso-manuals-index`；当前主链路查的是 `contoso-products`。商品索引保存的是商品描述，不能据此声称 20 份完整说明书已经接入问答。
- 上游返回一次性字典响应。虽然导入了流式相关类型，当前路由没有实现流式回答。
- README 演示路径写为 `/api/create_request`，实际 [main.py](https://github.com/Azure-Samples/contoso-chat/blob/028921fe3209db3216075d34ced6c109de132533/src/api/main.py) 定义的是 `/api/create_response`，标量参数按该路由签名传递。
- 回答模板的 `max_tokens` 为 128，且含“与用户意见不一致就结束对话”的规则。迁移时应重写中文服务规则并配置合适的回答长度。
- 读取订单采用直接切片，没有按日期排序；应称为前两条，而不能当作最新两条。客户 6 的会员等级是字符串 `nan`，应归一为未知，不能据此编造会员权益。
- 样例商品金额和订单日期应保留原含义；2023 年模拟购买记录不能展示为当前订单。预算筛选应按结构化价格字段校验。

以上是固定版本源码观察，不是运行后的故障复现结果。

**建议的一个 Demo：户外装备顾问**

| Demo 内的特色功能 | 用户能看到的体验 | 需要的资料与能力 |
| --- | --- | --- |
| 选购与比较 | 先澄清人数、预算、使用场景，输出带价格与规格的商品推荐和对比 | 商品查询工具、结构化价格与规格 |
| 使用与保养 | 解答搭建、收纳、保养问题，并能查看说明书来源 | 将 20 份说明书接入平台知识库 |
| 购买记录与搭配 | 查看模拟购买记录，避免重复推荐，解释搭配理由 | 客户及订单查询工具、模拟用户切换 |

三项能力放在同一个聊天 Demo 内。客户切换改变的是模拟背景；推荐问题分类和“换一组”继续只服务于找问题与填入输入框。

可以准备以下 9 个推荐问题，沿用当前桌面 3×3 布局。下列问题为本次撰写，不是上游已经生成的回答：

| 选购与比较 | 使用与保养 | 购买记录与搭配 |
| --- | --- | --- |
| 四个人露营，预算 300 美元，有哪些帐篷可选？ | TrailMaster X4 帐篷应该如何搭建？ | 这个模拟客户之前买过哪些装备？ |
| TrailMaster X4 和 SkyView 2-Person Tent 有什么区别？ | 帐篷淋雨后应该如何收纳？ | 根据历史购买记录，哪些装备不用重复买？ |
| EcoFire 和 PowerBurner 两款炉具怎么选？ | 帮我从说明书整理一份出行前检查清单。 | 在已有装备基础上，给我一份补充采购清单。 |

每个问题的最终答案都应以接入后的目录与说明书为依据；不将缺失规格补写成已知事实。

**与现有项目的分工建议**

Demo Hub 继续承担 React/Next.js 展示、模拟客户选择和业务数据服务。可以提供 `search_products`、`get_product`、`get_customer_profile`、`list_customer_orders` 等只读 HTTP/MCP 工具；客户范围由服务端根据访客和所选模拟背景约束。

Agent、提示词、工具绑定、模型、知识库与会话执行继续使用 Agent Studio。商品和客户业务代码不进入通用平台。商品说明书使用既有知识库能力管理，不另建检索运行时。

这一步的重点是适配资料、重写服务提示词、接通说明书与只读工具，以及展示商品信息和来源。上述新 Agent、知识库或工具配置此轮均未创建或发布。

**许可与状态**

仓库采用 [MIT](https://github.com/Azure-Samples/contoso-chat/blob/028921fe3209db3216075d34ced6c109de132533/LICENSE)，复用代码和资料时保留上游许可及来源。GitHub 显示仓库已于 2026-06-13 归档。原部署依赖 Azure OpenAI、Azure AI Search、Cosmos DB 和 Azure Container Apps；Docker Compose 仅运行 API 容器，并未提供完整的本地替代服务。
