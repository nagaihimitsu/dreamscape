import { describe, expect, it } from "vitest";
import characterData from "../../content/presentation/characters.json";
import { battleCharacterId, characterCatalogSchema, characterImage } from "./character-assets";

const base = characterCatalogSchema.parse(characterData).characters[0];
describe("character artwork registration", () => {
  it("uses the base image when an optional expression or costume is missing", () => {
    expect(characterImage({ ...base, imagePath: "assets/base.png", variants: [] }, { emotion: "shy", costume: "coat" })).toBe("assets/base.png");
  });
  it("chooses the most specific matching variant without moving its placement", () => {
    const character = { ...base, imagePath: "assets/base.png", variants: [
      { emotion: "shy", imagePath: "assets/shy.png" },
      { emotion: "shy", costume: "coat", imagePath: "assets/shy-coat.png" },
    ] };
    expect(characterImage(character, { emotion: "shy", costume: "coat" })).toBe("assets/shy-coat.png");
    expect(characterImage(character, { emotion: "shy" })).toBe("assets/shy.png");
    expect(character.placement).toEqual(base.placement);
  });
  it("allows an intentional placeholder while rejecting duplicate IDs and unsafe paths", () => {
    expect(base.imagePath).toBeNull();
    expect(characterCatalogSchema.safeParse({ schemaVersion: 1, characters: [base, base] }).success).toBe(false);
    expect(characterCatalogSchema.safeParse({ schemaVersion: 1, characters: [{ ...base, imagePath: "assets/../../outside.svg" }] }).success).toBe(false);
  });
  it("rejects duplicate variant selectors", () => {
    const v = { emotion: "shy", imagePath: null };
    expect(characterCatalogSchema.safeParse({ schemaVersion: 1, characters: [{ ...base, variants: [v, v] }] }).success).toBe(false);
  });
  it("maps each battle independently and preserves the default portrait when unmapped", () => {
    const assignments = { first_battle: "first_enemy", second_battle: "second_enemy" };
    expect(characterCatalogSchema.safeParse({
      schemaVersion: 1,
      characters: [{ ...base, id: "first_enemy" }, { ...base, id: "second_enemy" }],
      battleCharacters: assignments,
    }).success).toBe(true);
    expect(battleCharacterId(assignments, "first_battle")).toBe("first_enemy");
    expect(battleCharacterId(assignments, "second_battle")).toBe("second_enemy");
    expect(battleCharacterId(assignments, "other_battle")).toBe("enemy");
    expect(battleCharacterId(assignments, "constructor")).toBe("enemy");
    expect(battleCharacterId(undefined, "other_battle")).toBe("enemy");
  });
  it("rejects a mapping to an unregistered character", () => {
    const result = characterCatalogSchema.safeParse({
      ...characterData,
      battleCharacters: { first_battle: "missing_enemy" },
    });
    expect(result.success).toBe(false);
  });
});
