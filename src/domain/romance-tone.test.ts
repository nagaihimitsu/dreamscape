import { describe, expect, it } from "vitest";
import { deriveRelationshipTone, RELATIONSHIP_TONES } from "./romance-tone";

describe("relationship tone", () => {
  it.each([
    [{ affection: 0, trust: 0, spark: 0 }, "reserved"],
    [{ affection: 2, trust: -1, spark: 0 }, "strained"],
    [{ affection: 2, trust: 3, spark: 1 }, "comfortable"],
    [{ affection: 2, trust: 1, spark: 3 }, "guarded_attraction"],
    [{ affection: 4, trust: 3, spark: 2 }, "warm"],
    [{ affection: 6, trust: 4, spark: 4 }, "romantic_tension"],
  ] as const)("classifies %o as %s", (values, expected) => {
    expect(deriveRelationshipTone(values)).toBe(expected);
    expect(RELATIONSHIP_TONES).toContain(expected);
  });

  it("makes threshold precedence explicit and stable at boundaries", () => {
    expect(deriveRelationshipTone({ affection: 6, trust: 4, spark: 3 })).toBe("warm");
    expect(deriveRelationshipTone({ affection: 6, trust: 3, spark: 4 })).toBe("warm");
    expect(deriveRelationshipTone({ affection: 5, trust: 4, spark: 4 })).toBe("warm");
    expect(deriveRelationshipTone({ affection: 4, trust: 3, spark: 1 })).toBe("comfortable");
    expect(deriveRelationshipTone({ affection: 4, trust: 1, spark: 2 })).toBe("strained");
    expect(deriveRelationshipTone({ affection: 4, trust: 1, spark: 3 })).toBe("guarded_attraction");
    expect(deriveRelationshipTone({ affection: 4, trust: -1, spark: 3 })).toBe("guarded_attraction");
    expect(deriveRelationshipTone({ affection: 4, trust: -2, spark: 3 })).toBe("strained");
    expect(deriveRelationshipTone({ affection: 2, trust: 0, spark: 2 })).toBe("reserved");
  });
});
