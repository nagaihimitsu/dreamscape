import { describe, expect, it } from "vitest";
import { scenePerson } from "./scene-person";

const people = [
  { id: "smp_lili", cityId: "mihon", nameJa: "リリ" },
  { id: "smp_toma", cityId: "mihon", nameJa: "トーマ", characterId: "smp_toma_art" },
  { id: "smp_ana", cityId: "mihon", nameJa: "アナ", characterId: "smp_ana_art" },
];

describe("scenePerson", () => {
  it("takes the first person of the scene that has a portrait", () => {
    expect(scenePerson(people, ["smp_lili", "smp_toma", "smp_ana"])).toEqual({ characterId: "smp_toma_art", nameJa: "トーマ" });
    expect(scenePerson(people, ["smp_ana", "smp_toma"])).toEqual({ characterId: "smp_ana_art", nameJa: "アナ" });
  });

  it("finds no one in a scene without a person who has a portrait", () => {
    expect(scenePerson(people, ["smp_lili"])).toBeUndefined();
    expect(scenePerson(people, [])).toBeUndefined();
    expect(scenePerson(people, undefined)).toBeUndefined();
    expect(scenePerson(people, ["smp_unknown"])).toBeUndefined();
  });
});
