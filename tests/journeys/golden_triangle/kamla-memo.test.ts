import { describe, expect, it } from "vitest";
import { encounters } from "../../../src/content/encounters";
import { cityFinaleResult } from "../../../src/dev/scenario-builders";
import { startCityEpilogue } from "../../../src/domain/epilogue";
import { itemLines } from "../../../src/domain/item-lines";

// Kamla's memo (2026-11-15 user decision): the sixth line, which she writes in the Jaipur epilogue, shows from the start of
// that epilogue (epilogueStarted), so 「# item_out: gt_delhi_kamla_memo 6」 in the scene has a sixth line to point at.
describe("Kamla's memo", () => {
  const memo = encounters.items.find((item) => item.id === "gt_delhi_kamla_memo")!;
  const finale = cityFinaleResult("jaipur", { names: ["航", "澪"] });

  it("has five lines before the Jaipur epilogue and six from its start", () => {
    expect(itemLines(finale, memo.linesJa)).toHaveLength(5);
    const epilogue = startCityEpilogue(finale, "jaipur", finale.revision);
    expect(epilogue.activeEpilogue).not.toBeNull();
    expect(itemLines(epilogue, memo.linesJa)).toHaveLength(6);
    expect(itemLines(epilogue, memo.linesJa)?.[5]).toBe("ジャイプール。通りで踊った夜");
  });
});
