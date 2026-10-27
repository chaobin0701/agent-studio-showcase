export function publicText(value: string) {
  return value.replace(/\n\n\[公开演示资料：[\s\S]*\]$/, "");
}
