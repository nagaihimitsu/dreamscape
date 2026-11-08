import { describe, expect, it } from "vitest";
import { currencyForCity, formatMoney, formatMoneyForCity } from "./currency";

describe("journey money", () => {
  it("uses the journey currency for each city and rejects unregistered cities", () => {
    expect(formatMoneyForCity("milano", 60)).toBe("€60");
    for (const city of ["delhi", "agra", "jaipur"]) {
      expect(currencyForCity(city).code).toBe("INR");
      expect(formatMoneyForCity(city, 60)).toBe("₹60");
    }
    expect(formatMoneyForCity("delhi", 30_000)).toBe("₹30,000");
    expect(() => formatMoneyForCity("unknown_city", 60)).toThrow("No journey currency");
  });

  it("separates every three digits after any symbol, a word with its space included", () => {
    expect(formatMoney("€", 0)).toBe("€0");
    expect(formatMoney("€", 999)).toBe("€999");
    expect(formatMoney("€", 1000)).toBe("€1,000");
    expect(formatMoney("₹", 30_000)).toBe("₹30,000");
    expect(formatMoney("₭", 1_234_567)).toBe("₭1,234,567");
    expect(formatMoney("soʻm ", 4_000_000)).toBe("soʻm 4,000,000");
  });
});
