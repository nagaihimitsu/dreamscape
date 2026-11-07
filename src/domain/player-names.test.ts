import { describe, expect, it } from "vitest";
import { nameOrDefault } from "./player-names";

// UI stage 0, item I: the title's name fields show the default names as placeholders,
// and a field left empty starts the journey with its default name.
describe("nameOrDefault", () => {
  it("uses the default name for a field left empty", () => {
    expect(nameOrDefault("", "たいち")).toBe("たいち");
  });

  it("counts a field of spaces only (also full-width spaces and tabs) as empty", () => {
    expect(nameOrDefault("   ", "あゆみ")).toBe("あゆみ");
    expect(nameOrDefault("　　", "あゆみ")).toBe("あゆみ");
    expect(nameOrDefault("\t \n", "あゆみ")).toBe("あゆみ");
  });

  it("keeps a typed name, without the spaces around it", () => {
    expect(nameOrDefault("航", "たいち")).toBe("航");
    expect(nameOrDefault("  澪　", "あゆみ")).toBe("澪");
    expect(nameOrDefault("  ミラノ　太郎 ", "たいち")).toBe("ミラノ　太郎");
  });

  it("never replaces a typed name by the default, even one equal to a default", () => {
    expect(nameOrDefault("あゆみ", "たいち")).toBe("あゆみ");
    expect(nameOrDefault("0", "たいち")).toBe("0");
  });
});
