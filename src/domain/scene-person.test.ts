import { describe, expect, it } from "vitest";
import { scenePerson, speakingPerson } from "./scene-person";

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

describe("speakingPerson", () => {
  it("gives the portrait of a person who says the line in their own name", () => {
    expect(speakingPerson(people, { speaker: "person", speakerPersonId: "smp_toma" })).toBe("smp_toma_art");
  });

  it("brings no one in for a person without a portrait, another speaker, a phone's message or a sheet's line", () => {
    expect(speakingPerson(people, { speaker: "person", speakerPersonId: "smp_lili" })).toBeUndefined();
    expect(speakingPerson(people, { speaker: "enemy" })).toBeUndefined();
    expect(speakingPerson(people, { speaker: "narrator" })).toBeUndefined();
    expect(speakingPerson(people, { speaker: "person", speakerPersonId: "smp_toma", phone: { side: "received" } })).toBeUndefined();
    expect(speakingPerson(people, { speaker: "person", speakerPersonId: "smp_toma", letter: { kind: "note" } })).toBeUndefined();
  });
});
