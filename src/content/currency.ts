import { getJourneyForCity } from "./journeys";

/** Fail closed if a city has no journey; money must never silently become euros. */
export function currencyForCity(cityId: string) {
  const journey = getJourneyForCity(cityId);
  if (!journey) throw new Error(`No journey currency for city: ${cityId}`);
  return journey.currency;
}

const grouped = new Intl.NumberFormat("ja-JP");

/**
 * An amount as players read it: the symbol and the number with thousands
 * separators (「₹30,000」, 「soʻm 4,000,000」). Screen-reader labels that name the
 * unit in words (the HUD budget's 「旅の予算 30000ルピー」) keep the plain number.
 */
export function formatMoney(symbol: string, amount: number): string {
  return `${symbol}${grouped.format(amount)}`;
}

export function formatMoneyForCity(cityId: string, amount: number): string {
  return formatMoney(currencyForCity(cityId).symbol, amount);
}
