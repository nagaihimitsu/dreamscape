import { describe, expect, it } from "vitest";
import { currencyForCity, formatMoneyForCity } from "./currency";

describe("journey money", () => {
  it("uses the journey currency for each city and rejects unregistered cities", () => {
    expect(formatMoneyForCity("milano", 60)).toBe("€60");
    for (const city of ["delhi", "agra", "jaipur"]) {
      expect(currencyForCity(city).code).toBe("INR");
      expect(formatMoneyForCity(city, 60)).toBe("₹60");
    }
    expect(() => formatMoneyForCity("unknown_city", 60)).toThrow("No journey currency");
  });
});
