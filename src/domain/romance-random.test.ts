import { describe, expect, it } from "vitest";
import data from "../../content/romance/response_profiles.json";
import { responseProfileCatalogSchema } from "../content/schemas";
import {
  createRomanceRollPlan,
  resolveRomanceChoice,
  romanceSuccessChance,
} from "./romance-random";

// Validate the checked-in profiles before exercising their intended balance.
const profiles = responseProfileCatalogSchema.parse(data).profiles;
const profile = (id: string) => profiles.find((item) => item.id === id)!;
const base = { affection: 0, trust: 0, spark: 0 };
const ticket = (reaction: number, delta = 0) => ({
  reaction, affection: delta, trust: delta, spark: delta,
});

describe("romance reaction tickets", () => {
  it("generates exactly four stable integer tickets per choice from the injected source", () => {
    const values = [0, 1, 2, 3, 9999, 44, 55, 66];
    const plan = createRomanceRollPlan(2, () => values.shift()!);
    expect(plan).toEqual([
      { reaction: 0, affection: 1, trust: 2, spark: 3 },
      { reaction: 9999, affection: 44, trust: 55, spark: 66 },
    ]);
    expect(() => createRomanceRollPlan(1, () => 10000)).toThrow();
    expect(() => createRomanceRollPlan(1, () => -1)).toThrow();
    expect(() => createRomanceRollPlan(1, () => 0.5)).toThrow();
    expect(() => createRomanceRollPlan(-1, () => 1)).toThrow();
  });

  it("reproduces the exact outcome and deltas with the same ticket", () => {
    const p = profile("bold");
    const current = { affection: 4, trust: 2, spark: 5 };
    const roll = ticket(6000, 6800);
    expect(resolveRomanceChoice(p, current, roll)).toEqual(resolveRomanceChoice(p, current, roll));
    expect(resolveRomanceChoice(p, current, ticket(0)).result).toBe("positive");
    expect(resolveRomanceChoice(p, current, ticket(9999)).result).toBe("negative");
  });

  it("uses all three current relationship values and varies weights by profile", () => {
    const p = profile("bold");
    const p0 = romanceSuccessChance(p, base);
    expect(romanceSuccessChance(p, { ...base, affection: 1 })).toBeGreaterThan(p0);
    expect(romanceSuccessChance(p, { ...base, trust: 1 })).toBeGreaterThan(p0);
    expect(romanceSuccessChance(p, { ...base, spark: 1 })).toBeGreaterThan(p0);
    expect(romanceSuccessChance(p, { ...base, spark: 5 })).toBeGreaterThan(
      romanceSuccessChance(p, { ...base, trust: 5 }),
    );
    const attentive = profile("attentive");
    expect(romanceSuccessChance(attentive, { ...base, trust: 5 })).toBeGreaterThan(
      romanceSuccessChance(attentive, { ...base, spark: 5 }),
    );
  });

  it("clamps chance, treats its boundary correctly, and stays inside every range", () => {
    for (const p of profiles) {
      expect(romanceSuccessChance(p, { affection: -1000, trust: -1000, spark: -1000 })).toBe(p.minChance);
      expect(romanceSuccessChance(p, { affection: 1000, trust: 1000, spark: 1000 })).toBe(p.maxChance);
      expect(resolveRomanceChoice(p, base, ticket(p.baseChance * 100 - 1)).result).toBe("positive");
      expect(resolveRomanceChoice(p, base, ticket(p.baseChance * 100)).result).toBe("negative");
      for (const reaction of [0, 9999]) for (const delta of [0, 1, 4999, 5000, 9998, 9999]) {
        const outcome = resolveRomanceChoice(p, base, ticket(reaction, delta));
        for (const key of ["affection", "trust", "spark"] as const) {
          expect(outcome.deltas[key]).toBeGreaterThanOrEqual(p[outcome.result][key][0]);
          expect(outcome.deltas[key]).toBeLessThanOrEqual(p[outcome.result][key][1]);
        }
      }
    }
  });

  it("allows negative reactions with rising spark and positive reactions with falling spark", () => {
    expect(resolveRomanceChoice(profile("bold"), base, ticket(9999, 9999))).toMatchObject({
      result: "negative", deltas: { trust: -1, spark: 2 },
    });
    expect(resolveRomanceChoice(profile("attentive"), base, ticket(0, 0))).toMatchObject({
      result: "positive", deltas: { spark: -1 },
    });
  });

  it("recomputes the second threshold from the relationship resulting from the first", () => {
    const p = profile("attentive");
    const first = resolveRomanceChoice(p, base, ticket(0));
    const after = {
      affection: base.affection + first.deltas.affection,
      trust: base.trust + first.deltas.trust,
      spark: base.spark + first.deltas.spark,
    };
    const held = ticket(8300);
    expect(resolveRomanceChoice(p, base, held).result).toBe("negative");
    expect(resolveRomanceChoice(p, after, held).result).toBe("positive");
  });
});
