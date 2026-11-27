import { describe, expect, it } from "vitest";
import { createGame } from "./game";
import { applyChoiceEffects, choiceDisplay } from "./scene-effects";

// A choice's `# item: <item ID>` (2026-11-27): the item is held from the choice on, as a scene's `# on_done: item` gives it;
// an item recorded already (held, given, used, left behind) stays as it is, so a second time never gives it twice.

const ITEM = "galleria_ticket";
const option = { id: "take", knot: "x_talk", items: [ITEM] };

describe("a choice's # item:", () => {
  it("makes the item held, once", () => {
    const state = createGame();
    expect(state.inventory[ITEM]).toBeUndefined();
    const first = applyChoiceEffects(state, "x_talk", option).state;
    expect(first.inventory[ITEM]).toBe("held");
    expect(applyChoiceEffects(first, "x_talk", option).state).toEqual(first);
  });

  it("leaves an item given or used already as it is, and does not hide the choice", () => {
    const state = { ...createGame(), inventory: { [ITEM]: "used" as const } };
    expect(applyChoiceEffects(state, "x_talk", option).state.inventory[ITEM]).toBe("used");
    expect(choiceDisplay(state, option)).toEqual({ show: "open" });
  });
});
