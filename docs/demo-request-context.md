# 展示体验的模拟资料上下文

新请求由展示站服务端根据已保存会话的角色、月份或年份组装。`message` 保留原始问题；平台现有接口通过 `context.data` 接收模拟资料，并在执行记录和消息上下文中独立保存。浏览器传入的同名上下文字段不作为资料来源。

| 体验 | `context.data` 字段 |
| --- | --- |
| 扫地机器人 | `demo: "robot-assistant"`、`userId: string`、`userName: string`、`month: string`（如 `2025-12`） |
| Contoso | `demo: "contoso-outdoor"`、`customerId: string`、`customerName: string`、`year: number`（2023）、`currency: "CNY"` |

示例（Contoso）：

```json
{
  "message": "我的模拟购买记录中有哪些装备？",
  "context": {
    "data": {
      "demo": "contoso-outdoor",
      "customerId": "7",
      "customerName": "刘洋",
      "year": 2023,
      "currency": "CNY"
    }
  }
}
```

历史消息不迁移，`publicText()` 保留原来的末尾资料过滤规则。旧会话中新问题使用结构化上下文；已保存请求的重试直接复用原请求体和请求标识。显式恢复仍沿用原有逻辑，仅将 `stream` 改为 `false`，不会重组问题、资料或会话 ID。

## 已发布 Prompt 的待办（本次不发布）

本次只更新以下 Prompt 源文件；线上已发布版本及 Agent 绑定不会自动变化。

| Prompt key | 源文件 | 需要单独更新的内容 |
| --- | --- | --- |
| `demo_hub.robot` | `docs/robot-agent-prompt.txt` | 从 `context.data.userId/userName/month` 读取资料，工具参数仍使用 `user_id`；缺少结构化资料时兼容旧消息尾部。 |
| `demo_hub.contoso` | `docs/contoso-agent-prompt.txt` | 从 `context.data.customerId/customerName/year/currency` 读取资料；保留虚构数据、工具查询、人民币模拟定价及历史 USD 的约束。 |

后续经单独授权，在后台为上述 Prompt 创建版本、更新相应 Agent 绑定并验证后发布。不要为此自动运行 `connect-agent.ts` 或 `connect-contoso.ts`，它们会产生远程配置副作用。
