import type { QuotaPolicy, SharedQuota } from "./types";
export type QuotaNotice = { level: "neutral" | "warning" | "blocked"; blocked: boolean; reason?: "daily-requests" | "daily-tokens" | "minute" | "reserved"; title: string; detail: string };
export function quotaNotice(quota: SharedQuota): QuotaNotice {
  const dailyTime = formatReset(quota.resetAt, true);
  if (quota.requests && quota.requests.remaining <= 0) return { level: "blocked", blocked: true, reason: "daily-requests", title: "今日共享请求额度已用完", detail: `${dailyTime} 恢复后可继续发送。` };
  if (quota.tokens && quota.tokens.used >= quota.tokens.limit) return { level: "blocked", blocked: true, reason: "daily-tokens", title: "今日共享 Token 额度已用完", detail: `${dailyTime} 恢复后可继续发送。` };
  if (quota.tokens && quota.tokens.remaining <= 0) return { level: "warning", blocked: true, reason: "reserved", title: "共享 Token 额度暂被占用", detail: "其他请求正在执行，预留释放或结算后可继续。请稍后刷新。" };
  if (quota.minute && quota.minute.remaining <= 0) return { level: "blocked", blocked: true, reason: "minute", title: "最近 60 秒请求已达上限", detail: `最早可在 ${formatReset(quota.minute.retryAt)} 重试，每日剩余额度仍然保留。` };
  const meters = [quota.requests, quota.tokens ? { ...quota.tokens, used: quota.tokens.used + quota.tokens.reserved } : undefined, quota.minute].filter(item => item !== undefined);
  if (meters.some(item => item.used / item.limit >= 0.85)) return { level: "warning", blocked: false, title: "共享额度接近上限", detail: "所有访客共同使用这份额度，请适量体验。" };
  return { level: "neutral", blocked: false, title: meters.length ? "所有访客共享额度，请适量体验" : "当前未启用共享额度限制", detail: meters.length ? "用量包含本展示站的所有访客，不是你的个人额度。" : "请求仍由服务端校验，不代表模型上下文容量没有限制。" };
}
export function quotaPolicy(quota: SharedQuota): QuotaPolicy {
  return { ...(quota.requests ? { dailyRequests: quota.requests.limit } : {}), ...(quota.tokens ? { dailyTokens: quota.tokens.limit } : {}), ...(quota.minute ? { requestsPerMinute: quota.minute.limit } : {}) };
}
export function formatCount(value: number) {
  return value >= 1000 ? `${Number((value / 1000).toFixed(1))}k` : value.toLocaleString("zh-CN");
}
export function formatReset(value: string, date = false) {
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", ...(date ? { month: "numeric", day: "numeric" } : {}), hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}
