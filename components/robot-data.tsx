"use client";
import { useEffect, useState } from "react";
import { profiles, months, type robotSnapshot } from "@/lib/robot/service";
type Snapshot = ReturnType<typeof robotSnapshot>;
export function RobotData({
  persona = "1001",
  month = months[0],
  onChange,
  compact = false,
  disabled = false,
}: {
  persona?: string;
  month?: string;
  onChange?: (persona: string, month: string) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState(persona);
  const [period, setPeriod] = useState(month);
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setSelected(persona);
    setPeriod(month);
  }, [persona, month]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    fetch(
      `/api/hub/robot?${new URLSearchParams({ user: selected, month: period })}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("数据暂时无法加载");
        return response.json();
      })
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setError(error.message);
      });
    return () => controller.abort();
  }, [selected, period]);
  const change = (user: string, value: string) => {
    setSelected(user);
    setPeriod(value);
    onChange?.(user, value);
  };
  return (
    <div>
      <p className="section-kicker mb-3">DEMO DATA</p>
      <h2 className="text-lg font-semibold">认识这个模拟家庭</h2>
      <p className="mt-2 mb-5 text-xs leading-6 text-waterloo">
        查看角色的城市、家庭情况与清洁记录，也可以切换角色和月份。
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          disabled={disabled}
          aria-label="模拟用户"
          className="min-w-0 flex-1 rounded-lg border border-[#e2e7f0] bg-white px-3 py-2.5 text-xs"
          value={selected}
          onChange={(event) => change(event.target.value, period)}
        >
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} · {profile.id}
            </option>
          ))}
        </select>
        <select
          disabled={disabled}
          aria-label="示例月份"
          className="rounded-lg border border-[#e2e7f0] bg-white px-3 py-2.5 text-xs"
          value={period}
          onChange={(event) => change(selected, event.target.value)}
        >
          {months.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="mt-5 text-sm text-red-600">
          {error}
        </p>
      )}
      {!data && !error && <p className="mt-5 text-xs text-waterloo" role="status">正在读取角色资料…</p>}
      {data && (
        <>
          <div className="chat-data-field">
            <div className="mb-2 flex items-center gap-2">
              <span
                className="grid size-8 place-items-center rounded-full text-xs text-[#475672]"
                style={{ background: data.profile.avatar }}
              >
                {data.profile.name[0]}
              </span>
              <span className="text-sm font-medium">{data.profile.name}</span>
              <span className="ml-auto text-xs text-waterloo">
                {data.profile.city}
              </span>
            </div>
            <p className="text-xs leading-6 text-waterloo">
              {data.record?.feature ?? data.profile.home}
            </p>
          </div>
          {[
            ["清洁效率", data.record?.efficiency],
            ["耗材状态", data.record?.consumables],
            ["使用对比", data.record?.comparison],
          ].map(([title, value]) => (
            <div key={title} className="chat-data-field">
              <h3 className="mb-2 text-xs font-medium">{title}</h3>
              <p className="whitespace-pre-line text-xs leading-7 text-waterloo">
                {value ?? "该月份暂无示例记录"}
              </p>
            </div>
          ))}
          <p className="mt-5 text-[10px] leading-6 text-[#949ba9]">
            {data.dataSource.label} · 原始记录月份为 {data.month}。
            {!compact &&
              "数据来自参考项目的演示 CSV；这里不连接真实设备或个人账户。"}
          </p>
        </>
      )}
    </div>
  );
}
