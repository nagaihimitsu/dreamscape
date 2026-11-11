import { describe, expect, it } from "vitest";
import { NARRATION_PLATE, nameCutIn, speakerPlate } from "./speaker-plate";

const people = [
  { id: "smp_mihon_lili", cityId: "mihon", nameJa: "リリ" },
  { id: "smp_mihon_toma", cityId: "mihon", nameJa: "トマ", titleJa: "時計番", characterId: "smp_toma" },
];
const names = { heroine: "ヒロイン", player: "主人公" };

describe("the name plate of a line", () => {
  it("names the heroine, the player and a declared person, and marks only narration as narration", () => {
    expect(speakerPlate({ speaker: "heroine" }, names, people)).toEqual({ name: "ヒロイン", narration: false });
    expect(speakerPlate({ speaker: "player" }, names, people)).toEqual({ name: "主人公", narration: false });
    expect(speakerPlate({ speaker: "person", speakerPersonId: "smp_mihon_lili" }, names, people)).toEqual({ name: "リリ", narration: false });
    expect(speakerPlate({ speaker: "narrator" }, names, people)).toEqual({ name: NARRATION_PLATE, narration: true });
  });

  it("names enemy lines by the one opposite on the screen, and shows narration when there is no one", () => {
    expect(speakerPlate({ speaker: "enemy" }, { ...names, enemy: "トマ" }, people)).toEqual({ name: "トマ", narration: false });
    expect(speakerPlate({ speaker: "enemy" }, names, people)).toEqual({ name: NARRATION_PLATE, narration: true });
  });

  it("shows narration for a person who is not declared (a frame from another content version)", () => {
    expect(speakerPlate({ speaker: "person", speakerPersonId: "smp_nobody" }, names, people)).toEqual({ name: NARRATION_PLATE, narration: true });
    expect(speakerPlate({ speaker: "person" }, names, people)).toEqual({ name: NARRATION_PLATE, narration: true });
  });
});

describe("the name plate a line's # cutin: name shows", () => {
  const enemy = { titleJa: "図面の人", nameJa: "ハンナ", quoteJa: "「鐘は残すわ」" };
  it("shows a person's role and name, or the one opposite for an enemy line", () => {
    expect(nameCutIn({ speaker: "person", speakerPersonId: "smp_mihon_toma", cutin: "name" }, enemy, people)).toEqual({ titleJa: "時計番", nameJa: "トマ" });
    expect(nameCutIn({ speaker: "person", speakerPersonId: "smp_mihon_lili", cutin: "name" }, enemy, people)).toEqual({ nameJa: "リリ" });
    expect(nameCutIn({ speaker: "enemy", cutin: "name" }, enemy, people)).toEqual(enemy);
  });

  it("shows nothing without the tag, without anyone opposite, or for someone not declared", () => {
    expect(nameCutIn({ speaker: "person", speakerPersonId: "smp_mihon_toma" }, enemy, people)).toBeUndefined();
    expect(nameCutIn({ speaker: "enemy", cutin: "name" }, undefined, people)).toBeUndefined();
    expect(nameCutIn({ speaker: "person", speakerPersonId: "smp_nobody", cutin: "name" }, enemy, people)).toBeUndefined();
  });
});
