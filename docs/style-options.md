> 已确定采用 Zola + Solid Free（2026-10-16）。本文保留候选调研历史；当前实现见根目录 README。

# 官网与 GPT 风格聊天候选

检索与浏览器查看日期：2026-10-16。架构保持 Next.js / React / Node.js 不变。本轮只比较模板，未搭建应用、未购买模板、未登录第三方账号，也未发送聊天消息或验证模型调用。

## 聊天

### C1 · assistant-ui ChatGPT 示例（推荐）

[完整预览](https://www.assistant-ui.com/demos/chatgpt) · [示例与说明](https://www.assistant-ui.com/examples/chatgpt) · [代码 / MIT](https://github.com/assistant-ui/assistant-ui)

视觉：白底、细分隔线、收起或展开的会话栏、居中消息区、胶囊输入框。最接近本轮提出的 GPT 风格。

接入判断：继续用现成的多会话、消息与输入组件，通过自己的后端适配 Agent Studio。把 Demo 切换与会话列表分别表达，避免把模型列表当成 Demo 列表。实际支持的功能由适配器决定，不因模板里有按钮就承诺已接通附件、语音或历史分支。

![assistant-ui 官方 ChatGPT 示例](/Users/ccb/Developer/personal/demo-hub/output/playwright/chatgpt.png)

### C2 · Zola / prompt-kit

[预览](https://www.zola.chat/) · [源码 / Apache-2.0](https://github.com/ibelick/zola) · [底层组件 / MIT](https://github.com/ibelick/prompt-kit)

视觉：接近 GPT 的中性浅色界面，输入框更大，有模型选择和提示建议，适合做完整的聊天产品。

接入判断：完整应用包含自己的模型、身份与存储接入；如果作为本站底座，需要替换相应部分。prompt-kit 则是较轻的组件选项，但会话状态和后端连接需要自行整合。Zola README 将 MCP 标为进行中，不能据此假定兼容本站所需 MCP 服务。

![Zola 首屏](/Users/ccb/Developer/personal/demo-hub/output/playwright/zola.png)

### C3 · Vercel Chatbot / shadcn chatbot-template（代码对照）

[Vercel Chatbot 项目](https://github.com/vercel/chatbot) · [官方文档与内嵌体验](https://chatbot.ai-sdk.dev/) · [较轻的 shadcn/chatbot-template](https://github.com/shadcn-ui/chatbot-template)

Vercel Chatbot 是完整 Next.js 聊天应用，仓库采用 Apache-2.0；shadcn/chatbot-template 是更小的 MIT 模板。它们适合快速做完整 AI SDK 应用，但默认的模型调用流程仍需替换为本站适配器。当前访问 chatbot.ai-sdk.dev 得到文档主页与内嵌体验，截图不是完整聊天应用的会话页面。

![Vercel Chatbot 当前文档与内嵌体验](/Users/ccb/Developer/personal/demo-hub/output/playwright/vercel-chatbot.png)

## 官网

### H1 · Launch UI：工具产品风（优先比较）

[实际预览](https://www.launchuicomponents.com/) · [开源代码 / MIT](https://github.com/launch-ui/launch-ui)

大标题、柔和发光背景、产品界面大图，支持浅色与深色。适合开发者工具、实验室、产品与 Demo 集合。

范围：开源部分是可组合的区块与组件；官网还展示 Pro 区块和模板，不能把整个官网都视作 MIT 模板。仓库旧的 /preview 链接本次返回 404，应使用站点根地址。

![Launch UI 浅色预览](/Users/ccb/Developer/personal/demo-hub/output/playwright/launch-ui-light.png)

### H2 · Cruip Gray：黑白极简产品风（优先比较）

[实际预览](https://cruip.com/demos/gray/) · [模板与价格](https://cruip.com/gray/)

黑白灰、清楚的大标题、少量手绘强调、大面积产品展示。与 GPT 风格聊天容易形成统一视觉，适合独立产品站。

范围：完整付费模板，提供 Next.js 版本；本次页面标价 US$49。未购买。预览截图最上方的购买工具栏属于 Cruip 预览外壳，不是最终站点设计。

![Cruip Gray 预览](/Users/ccb/Developer/personal/demo-hub/output/playwright/gray.png)

### H3 · Zolt：创意作品与案例展示（优先比较）

[实际预览](https://shadcn-nextjs-zolt-landing-page.vercel.app/) · [代码 / MIT](https://github.com/shadcnstudio/shadcn-nextjs-zolt-landing-page-free)

暖白、橙色强调、点阵背景、个人作品叙事和案例详情。适合强调“我做过哪些项目、每个项目能体验什么”。如果作为独立品牌，需要把个人头像、履历和雇佣入口换为产品与项目内容。

范围：免费完整 Next.js 模板，含案例详情布局。当前仓库历史较短，实施前需检查实际交互与依赖，不能仅凭 README 的宣传判定全部能力已通过验证。

![Zolt 预览](/Users/ccb/Developer/personal/demo-hub/output/playwright/zolt.png)

### H4 · Magic UI SaaS：动效科技产品风

[实际预览](https://saas-magicui.vercel.app/) · [模板目录与付费范围](https://pro.magicui.design/)

白底、强强调色、居中大标题、产品视频与动态展示。适合突出交互效果；截图看不到的动效建议在原站滚动查看。

范围：这个 SaaS 模板属于 Magic UI Pro 付费产品，不应与其 MIT 组件库或免费 Portfolio 模板混淆。模板目录当前提供 Individual Lifetime US$199 套餐，具体许可与购买范围以购买页为准；未购买。

![Magic UI SaaS 预览](/Users/ccb/Developer/personal/demo-hub/output/playwright/magic-saas.png)

### H5 · Solid Free：完整商业 SaaS 官网

[实际预览](https://solid-free.nextjstemplates.com/) · [代码 / MIT](https://github.com/NextJSTemplates/solid-nextjs)

蓝色与薄荷绿点缀、插画、功能说明和比较完整的营销页面。风格更传统、信息承载多，适合希望少拼装、尽快形成完整官网的情况。

范围：免费版主要提供 UI，登录、博客、支付等集成不因页面存在就已经可用。预览中的版本宣传文字与当前仓库说明不完全同步，应以落地时的依赖检查为准。

![Solid Free 预览](/Users/ccb/Developer/personal/demo-hub/output/playwright/solid.png)

### H6 · Magic UI Portfolio：极简项目目录

[实际预览](https://portfolio-magicui.vercel.app/) · [代码 / MIT](https://github.com/magicuidesign/portfolio)

窄版排版、文字与项目为主、轻量动效与底部导航。适合个人项目集与实验记录；若要较完整的品牌产品站，需要重排首页内容。

范围：免费完整模板；这是 magicuidesign/portfolio，不是 once-ui-system/magic-portfolio。

![Magic UI Portfolio 预览](/Users/ccb/Developer/personal/demo-hub/output/playwright/magicui-portfolio.png)

## 当前建议

- 聊天首选 C1，保留 C2 为完整聊天产品方向的对照。
- 官网优先横向看 H1（工具产品）、H2（黑白极简）、H3（项目案例）；H4 为动效备选，H5 为完整商业页面备选，H6 为极简项目目录备选。
- 免费且可扩展：优先 H1 的开源区块；免费完整案例模板：优先 H3；愿意购买完整黑白产品模板：优先 H2。
- 原 Tailark Mist 仍保留为浅色产品风基线，不视为已经选定。
- Once UI Magic Portfolio 的许可证是 CC BY-NC 4.0；其根域名本次浏览得到域名停放页，因此没有列入本轮可直接采用的预览短名单。

这些视觉和适用性判断属于本轮浏览后的主观比较。首屏截图用于看风格；未测试整个第三方应用的功能、移动端或真实模型调用。
