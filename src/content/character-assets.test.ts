import { describe, expect, it } from "vitest";
import characterData from "../../content/presentation/characters.json";
import { characterCatalogSchema, characterImage } from "./character-assets";

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
});
