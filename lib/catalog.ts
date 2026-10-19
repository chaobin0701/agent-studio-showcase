export const robotFeatures = [
  {
    key: "knowledge",
    name: "知识问答",
    description: "查资料、问使用方法，逐步排查常见问题。",
    question: "机器人无法正常回充，该怎么排查？",
  },
  {
    key: "report",
    name: "清洁报告",
    description: "读取模拟家庭的月度记录，整理保养建议。",
    question: "请根据我的示例月份生成一份清洁使用报告和保养建议。",
  },
  {
    key: "weather",
    name: "天气建议",
    description: "结合所在城市的模拟天气，安排扫拖清洁。",
    question: "查询我所在城市的模拟天气，给出拖地建议。",
  },
] as const;
export const demos = [
  {
    slug: "robot-assistant",
    brand: "机器人实验室",
    name: "扫地机器人助手",
    eyebrow: "一个助手，三种能力",
    description: "知识问答、清洁报告和天气建议，在同一段对话里接着聊。",
    detail:
      "一个围绕家庭清洁的对话体验。可以查知识、分析模拟使用记录，也可以结合模拟天气获取清洁建议；直接提问即可，无需切换模式。",
    icon: "bot",
    features: robotFeatures,
    questions: robotFeatures.map((feature) => feature.question),
    disclaimer: "用户、使用记录与天气均为模拟数据。",
    dataDescription: "示例用户和记录公开可查，天气为固定样本。",
  },
  {
    slug: "contoso-outdoor",
    brand: "户外装备体验",
    name: "户外装备顾问",
    eyebrow: "选好装备，再出发",
    description: "选购比较、使用说明和购买记录，在一段对话里安排好下一次露营。",
    detail:
      "以 Contoso Outdoor 虚构商店为背景，结合 20 件户外装备、商品说明书和 12 位模拟客户的购买记录，提供有资料依据的推荐。商品与记录均为公开样例。",
    icon: "tent",
    features: [
      {
        key: "shopping",
        name: "选购与比较",
        description: "按预算与人数查商品，用规格解释选择。",
        question: "四个人露营，预算 2,000 元，有哪些帐篷可选？",
      },
      {
        key: "manuals",
        name: "使用与保养",
        description: "查阅商品说明书，获取有出处的使用指导。",
        question: "远行者 X4 四人帐篷应该如何搭建？请引用说明书。",
      },
      {
        key: "orders",
        name: "购买记录与搭配",
        description: "看看模拟客户买过什么，避免重复添置。",
        question: "根据我的模拟购买记录，推荐下一次露营需要补充的装备。",
      },
    ],
    questions: [
      "四个人露营，预算 2,000 元，有哪些帐篷可选？",
      "远行者 X4 四人帐篷应该如何搭建？",
      "我的模拟购买记录中有哪些装备？",
    ],
    disclaimer: "商品使用人民币模拟价格，购买记录为 2023 年模拟数据。",
    dataDescription:
      "20 件样例商品、20 份说明书与 12 位虚构客户；购买记录来自 2023 年。",
  },
] as const;
export type DemoSlug = (typeof demos)[number]["slug"];
const legacyDemoAliases: Record<string, string> = {
  "robot-report": "robot-assistant",
  "robot-weather": "robot-assistant",
};
export function canonicalDemoSlug(slug: string) {
  return Object.hasOwn(legacyDemoAliases, slug)
    ? legacyDemoAliases[slug]
    : slug;
}
export function relatedDemoSlugs(slug: string) {
  const canonical = canonicalDemoSlug(slug);
  return [
    canonical,
    ...Object.keys(legacyDemoAliases).filter(
      (alias) => legacyDemoAliases[alias] === canonical,
    ),
  ];
}
export function findDemo(slug: string) {
  return demos.find((demo) => demo.slug === canonicalDemoSlug(slug));
}
export const projects = [
  {
    slug: "contoso-outdoor",
    name: "户外装备顾问",
    label: "零售场景",
    description: "把商品资料、使用说明和购买记录接进一次有依据的户外装备咨询。",
    body: "参考微软 Contoso Chat 的公开样例，将商品、模拟客户和购买记录实现为独立的 Node.js 领域服务；说明书由 Agent Studio 知识库检索，工具通过 HTTP 与 MCP 接入。",
    href: "https://github.com/Azure-Samples/contoso-chat",
    linkText: "查看参考项目",
    demoSlugs: ["contoso-outdoor"],
    features: demos[1].features,
  },
  {
    slug: "robot-lab",
    name: "机器人实验室",
    label: "场景实验",
    description: "一个会查资料、读数据、写报告的扫地机器人助手。",
    body: "参考 LangChain ReAct Agent 的扫地机器人场景，将模拟用户、使用记录与天气查询实现为独立的 Node.js 领域服务，并通过 HTTP 与 MCP 提供工具。",
    href: "https://github.com/lhh737/LangChain-ReAct-Agent",
    linkText: "查看参考项目",
    demoSlugs: ["robot-assistant"],
    features: robotFeatures,
  },
] as const;

export type ProjectSlug = (typeof projects)[number]["slug"];
export function demosForProject(slug: string) {
  const project = projects.find((item) => item.slug === slug);
  if (!project) return [];
  return demos.filter((demo) => (project.demoSlugs as readonly string[]).includes(demo.slug));
}
export function projectForDemo(slug: string) {
  const canonical = canonicalDemoSlug(slug);
  return projects.find((project) => (project.demoSlugs as readonly string[]).includes(canonical));
}
