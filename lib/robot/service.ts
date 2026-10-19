import records from "@/data/robot-records.json";

export const dataSource = {
  kind: "simulated",
  label: "公开模拟数据",
  origin: "LangChain-ReAct-Agent 示例记录",
  period: "2025-01 至 2025-12",
  weather: "固定样本，非实时天气",
} as const;
const names = [
  "林小北",
  "陈可可",
  "周一鸣",
  "许安然",
  "苏小满",
  "陆知行",
  "何晓雨",
  "江晚",
  "唐清禾",
  "顾言",
];
const cities = ["深圳", "合肥", "杭州"];
export const months = [...new Set(records.map((record) => record.month))]
  .sort()
  .reverse();
export const profiles = [
  ...new Set(records.map((record) => record.user_id)),
].map((id, index) => ({
  id,
  name: names[index],
  city: cities[index % cities.length],
  home: records.find((record) => record.user_id === id)!.feature,
  avatar: ["#e8efff", "#e4f4ed", "#fff0e5"][index % 3],
}));
export function getProfile(id: string) {
  return profiles.find((profile) => profile.id === id);
}
export function getRecord(userId: string, month: string) {
  return (
    records.find(
      (record) => record.user_id === userId && record.month === month,
    ) ?? null
  );
}
export function robotSnapshot(userId: string, month: string) {
  const profile = getProfile(userId);
  if (!profile) throw new Error("unknown_demo_user");
  return {
    profile,
    month,
    record: getRecord(userId, month),
    months,
    profiles,
    dataSource,
  };
}
export function weatherSample(city: string) {
  const samples: Record<
    string,
    {
      condition: string;
      temperature: number;
      humidity: number;
      rainProbability: number;
    }
  > = {
    深圳: {
      condition: "多云",
      temperature: 28,
      humidity: 76,
      rainProbability: 30,
    },
    合肥: {
      condition: "晴",
      temperature: 23,
      humidity: 48,
      rainProbability: 10,
    },
    杭州: {
      condition: "小雨",
      temperature: 21,
      humidity: 85,
      rainProbability: 80,
    },
  };
  return samples[city]
    ? {
        city,
        ...samples[city],
        unit: "°C",
        dataSource: "固定模拟天气，非实时观测",
        adviceScope: "仅用于演示环境建议，不代表设备诊断",
      }
    : null;
}
