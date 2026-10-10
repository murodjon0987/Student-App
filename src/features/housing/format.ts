import { formatNumber } from "@/lib/format";

export function formatHousingPrice(price: number, currency: string) {
  if (currency === "USD") return `$${formatNumber(price)}`;
  return `${formatNumber(price)} so'm`;
}

export function formatPriceShort(price: number, currency: string) {
  if (currency === "USD") return `$${price}`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)} mln`;
  if (price >= 1_000) return `${Math.round(price / 1_000)}k`;
  return String(price);
}
