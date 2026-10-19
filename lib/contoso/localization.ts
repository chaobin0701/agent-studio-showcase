import sourceProfiles from "../../data/contoso/profiles.json";
import customerNames from "../../data/contoso/zh-CN/customers.json";

export const contosoDatasetVersion = "contoso-zh-CN-v1";
export const contosoProfiles = sourceProfiles.map((profile) => ({
  ...profile,
  name: (customerNames as Record<string, string>)[profile.customerId],
}));
export const membershipNames: Record<string, string> = {
  Base: "普通会员",
  Gold: "黄金会员",
  Platinum: "铂金会员",
};
export function formatCny(amount: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
