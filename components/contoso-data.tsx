"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { contosoProfiles as profiles, formatCny } from "@/lib/contoso/localization";
import type { contosoSnapshot } from "@/lib/contoso/service";
type Snapshot = ReturnType<typeof contosoSnapshot>;
export function ContosoData({
  persona = "contoso-1",
  onChange,
  disabled = false,
  compact = false,
}: {
  persona?: string;
  onChange?: (persona: string, month: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState(persona);
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  useEffect(() => setSelected(persona), [persona]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    fetch(`/api/hub/contoso?customer=${selected.replace(/^contoso-/, "")}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("资料暂时无法加载");
        return r.json();
      })
      .then((value) => {
        setData(value);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [selected]);
  return (
    <div>
      <p className="section-kicker mb-3">户外装备 · 模拟资料</p>
      <h2 className="text-lg font-semibold">装备与模拟购买记录</h2>
      <p className="mt-2 mb-5 text-xs leading-6 text-waterloo">
        选择一位虚构客户，看看已有装备；价格为人民币模拟价格。
      </p>
      <select
        aria-label="模拟客户"
        value={selected}
        disabled={disabled}
        className="w-full rounded-lg border border-[#e2e7f0] bg-white px-3 py-2.5 text-xs"
        onChange={(e) => {
          setSelected(e.target.value);
          onChange?.(e.target.value, "2023");
        }}
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · 客户 {p.customerId}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="mt-4 text-xs text-red-600">
          {error}
        </p>
      )}
      {!data && !error && (
        <p className="mt-5 text-xs text-waterloo">正在读取样例资料…</p>
      )}
      {data && (
        <>
          <div className="chat-data-field text-xs leading-6 text-waterloo">
            <p className="font-medium text-black">{data.profile?.name}</p>
            <p>
              样例会员标签：{data.profile?.membershipName ?? "未提供"} ·
              不代表折扣权益
            </p>
            <p>2023 年模拟购买记录 · {data.orders?.length ?? 0} 笔</p>
          </div>
          <h3 className="mt-5 text-xs font-medium">已购买的装备</h3>
          {data.orders?.map((o) => (
            <div key={o.id} className="chat-data-field">
              <span className="text-xs font-medium text-[#365b97]">{o.product?.name}</span>
              <p className="mt-2 text-[11px] leading-6 text-waterloo">
                {o.date} · {o.quantity} 件 · {formatCny(o.total)}
              </p>
            </div>
          ))}
          <h3 className="mt-6 text-xs font-medium">模拟商品目录 · 20 件</h3>
          <div
            className={
              compact
                ? "mt-3 max-h-[280px] overflow-y-auto"
                : "mt-3 grid gap-3 sm:grid-cols-2"
            }
          >
            {data.products.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-1 border-b border-[#e8edf3] py-3 text-xs"
              >
                <span>{p.name}</span>
                <span className="text-[10px] text-waterloo">
                  {p.categoryName} · {formatCny(p.price)}
                </span>
              </div>
            ))}
          </div>
          <Link href="/projects/contoso-outdoor#catalog" className="mt-4 inline-block text-xs text-primary hover:underline">查看项目商品目录 ↗</Link>
          <p className="mt-5 text-[10px] leading-6 text-[#949ba9]">
            {data.dataSource.note}
          </p>
        </>
      )}
    </div>
  );
}
