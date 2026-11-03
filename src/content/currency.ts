import { getJourneyForCity } from "./journeys";

/** Fail closed if a city has no journey; money must never silently become euros. */
export function currencyForCity(cityId: string) {
  const journey = getJourneyForCity(cityId);
  if (!journey) throw new Error(`No journey currency for city: ${cityId}`);
  return journey.currency;
}

export function formatMoneyForCity(cityId: string, amount: number): string {
  return `${currencyForCity(cityId).symbol}${amount}`;
}
