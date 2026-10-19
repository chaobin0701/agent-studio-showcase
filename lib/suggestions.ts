import {
  contosoSuggestionCategories,
  contosoSuggestions,
} from "./contoso/suggestions";
export function categoriesForDemo(slug: string) {
  return slug === "contoso-outdoor"
    ? contosoSuggestionCategories
    : suggestionCategories;
}
export const suggestionCategories = [
  { key: "knowledge", name: "知识问答" },
  { key: "report", name: "清洁报告" },
  { key: "weather", name: "天气建议" },
] as const;
export type SuggestionCategory =
  | (typeof suggestionCategories)[number]["key"]
  | (typeof contosoSuggestionCategories)[number]["key"];
const knowledge = [
  "机器人无法正常回充，该怎么排查？",
  "家里有宠物，滚刷和滤网该怎么维护？",
  "木地板和地毯混用时，清洁模式怎么选？",
  "机器人总被电线缠住，有哪些解决办法？",
  "拖地后留下水痕，应该先检查什么？",
  "第一次使用扫拖机器人，需要准备什么？",
  "机器人吸力变弱了，如何逐步排查？",
  "基站应该放在什么位置？",
  "拖布和滤网都能直接水洗吗？",
  "家里有长头发，怎样减少滚刷缠绕？",
  "机器人在地毯上打转，可能是什么原因？",
  "扫拖机器人日常保养需要注意哪些部位？",
  "水箱不出水，应该先检查哪些部位？",
  "启动清扫前，地面上需要收走哪些物品？",
  "怎样避免扫拖机器人把地毯拖湿？",
  "机器人经常卡在沙发底，怎么改善环境？",
  "怎么确认清洁液是否适合我的机器人？",
  "尘盒什么时候需要清理，有哪些判断方法？",
];
const report = [
  "根据我的示例月份，生成清洁使用报告和保养建议。",
  "看看我的使用记录，哪些耗材需要优先关注？",
  "分析我的清洁效率，给出三个改进建议。",
  "对比我 2025 年 6 月和 12 月的使用记录。",
  "用三句话总结我这个月的模拟清洁记录。",
  "结合我的家庭特征，安排一周的保养事项。",
  "我的耗材还有多久需要更换？请先查询记录。",
  "根据我的记录，哪些维护事项今天就该做？",
  "我的清洁表现与样本中的其他家庭相比怎么样？",
  "把我的使用记录整理成一张对照表。",
  "我选的家庭适合重点关注哪些清洁问题？",
  "查询我 2025 年 1 月的记录，并与当前示例月份对比。",
  "先查询我的记录，再总结家庭面积和地面特征。",
  "把我的耗材问题按维护优先级排序。",
  "根据现有记录，我的清洁表现有哪些值得保持的地方？",
  "对比我 2025 年 3 月和 9 月的耗材状态。",
  "为我的模拟家庭写一份简短的维护提醒。",
  "我的记录中哪些信息还不足以判断设备状态？",
];
const weather = [
  "查询我所在城市的模拟天气，给出拖地建议。",
  "查一下我的城市和模拟湿度，今天适合湿拖吗？",
  "结合模拟天气，为我安排今天的扫拖顺序。",
  "模拟天气比较潮湿时，拖布怎样干得更快？",
  "用模拟天气说明，什么情况下应该减少拖地水量？",
  "查询杭州的模拟天气，给出木地板清洁建议。",
  "查询深圳的模拟天气，今天清洁后如何通风？",
  "查询合肥的模拟天气，怎样安排地毯吸尘？",
  "雨天回家带入泥沙时，应该先扫还是先拖？",
  "结合我的模拟城市和使用记录，给三项清洁建议。",
  "湿度高的时候，水箱和拖布需要怎样保养？",
  "分别查询三个城市的模拟天气，对比拖地注意事项。",
  "查询我的模拟城市天气，说明拖地后多久能干是否可以判断。",
  "模拟天气潮湿时，木地板和瓷砖的清洁有何不同？",
  "模拟天气有雨时，进门区域应该怎样安排清洁？",
  "帮我总结今天模拟天气下的三条拖布保养提醒。",
  "天气湿度高时，基站周围有哪些清洁注意事项？",
  "结合模拟天气，帮我决定今天先吸尘还是先处理拖布。",
];
export const robotSuggestions = knowledge.flatMap((question, index) => [
  { id: `knowledge-${index}`, category: "knowledge" as const, question },
  {
    id: `report-${index}`,
    category: "report" as const,
    question: report[index],
  },
  {
    id: `weather-${index}`,
    category: "weather" as const,
    question: weather[index],
  },
]);
export function suggestionPage(
  category: SuggestionCategory,
  page: number,
  demo = "robot-assistant",
) {
  const source =
    demo === "contoso-outdoor" ? contosoSuggestions : robotSuggestions;
  const pool = source.filter((item) => item.category === category);
  if (!pool.length) return [];
  const offset = (Math.max(0, page) * 3) % pool.length;
  return Array.from(
    { length: Math.min(3, pool.length) },
    (_, index) => pool[(offset + index) % pool.length],
  );
}
