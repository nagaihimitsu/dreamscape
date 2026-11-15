import { describe, expect, it } from "vitest";
import { createGame } from "../domain/game";
import { itemLines } from "../domain/item-lines";
import { highlightedLine, ITEM_OUT_GAP_PX, ITEM_OUT_LEAST_PX, itemOutAnnouncement, itemOutFit, itemOutStep, itemOutText } from "./item-out";
import { itemShowLeaving } from "./item-show";

// A line's `# item_out: <item ID> [<n>]` (2026-11-15, 「品物を取り出す」): what its card shows, how it lasts from line to
// line, what screen readers hear and how tall it may be. The tag's form and its frames: src/content/story-tags-atmosphere.test.ts.

const memo = ["赤い城、暗くなってから。", "クトゥブ・ミナール、鉄の柱。", { textJa: "ジャイプール。通りで踊った夜", when: { epilogueViewed: "c2" } }];

describe("the card of an item taken out", () => {
  it("shows the lines the held items' detail shows now (a conditional line once it holds), the nth of them highlighted", () => {
    const state = createGame();
    expect(itemOutText(itemLines(state, memo), "メモ。", undefined)).toEqual({ lines: ["赤い城、暗くなってから。", "クトゥブ・ミナール、鉄の柱。"] });
    expect(itemOutText(itemLines(state, memo), "メモ。", 2)).toEqual({ lines: ["赤い城、暗くなってから。", "クトゥブ・ミナール、鉄の柱。"], highlight: 2 });
    // The third is written but does not show yet: nothing is highlighted; once it shows, it is.
    expect(itemOutText(itemLines(state, memo), "メモ。", 3)).toEqual({ lines: ["赤い城、暗くなってから。", "クトゥブ・ミナール、鉄の柱。"] });
    const later = { ...state, viewedEpilogueCityIds: ["c2"] };
    expect(itemOutText(itemLines(later, memo), "メモ。", 3)).toMatchObject({ highlight: 3 });
    expect(highlightedLine(itemOutText(itemLines(later, memo), "メモ。", 3))).toBe("ジャイプール。通りで踊った夜");
  });

  it("shows the item's description when nothing is written on it or nothing shows yet", () => {
    const state = createGame();
    expect(itemOutText(itemLines(state, undefined), "針が三時を指す絵のしおり。", undefined)).toEqual({ description: "針が三時を指す絵のしおり。" });
    expect(itemOutText(itemLines(state, [memo[2]]), "メモ。", 1)).toEqual({ description: "メモ。" });
    expect(itemOutText([], "メモ。", 1)).toEqual({ description: "メモ。" });
    expect(highlightedLine({ description: "メモ。" })).toBeUndefined();
  });

  it("stays while the next lines take out the same item, moving its highlight without coming in again, and goes after", () => {
    expect(itemOutStep(undefined, undefined)).toBe("none");
    expect(itemOutStep(undefined, { itemId: "memo" })).toBe("enter");
    expect(itemOutStep({ itemId: "memo" }, { itemId: "memo" })).toBe("stay");
    expect(itemOutStep({ itemId: "memo", line: 2 }, { itemId: "memo", line: 2 })).toBe("stay");
    expect(itemOutStep({ itemId: "memo" }, { itemId: "memo", line: 2 })).toBe("move");
    expect(itemOutStep({ itemId: "memo", line: 2 }, { itemId: "memo", line: 3 })).toBe("move");
    expect(itemOutStep({ itemId: "memo", line: 2 }, { itemId: "memo" })).toBe("move");
    expect(itemOutStep({ itemId: "memo" }, { itemId: "ticket" })).toBe("enter");
    expect(itemOutStep({ itemId: "memo", line: 1 }, undefined)).toBe("leave");
    // Its way back into the bag (GameApp's useItemShowLeave on the item's ID): not while the same item is out, nor for a load.
    expect(itemShowLeaving("memo", "memo", false)).toBeUndefined();
    expect(itemShowLeaving("memo", undefined, false)).toBe("memo");
    expect(itemShowLeaving("memo", "ticket", false)).toBe("memo");
    expect(itemShowLeaving("memo", undefined, true)).toBeUndefined();
  });

  it("is heard once as it comes, with its highlighted line or its lines, and the line again as the highlight moves", () => {
    const lines = itemOutText(["赤い城、暗くなってから。", "ジャイプール。通りで踊った夜"], "メモ。", undefined);
    expect(itemOutAnnouncement("カムラのメモ", lines, "enter")).toBe("カムラのメモを取り出した。赤い城、暗くなってから。ジャイプール。通りで踊った夜。");
    const second = itemOutText(["赤い城、暗くなってから。", "ジャイプール。通りで踊った夜"], "メモ。", 2);
    expect(itemOutAnnouncement("カムラのメモ", second, "enter")).toBe("カムラのメモを取り出した。ジャイプール。通りで踊った夜。");
    expect(itemOutAnnouncement("カムラのメモ", second, "move")).toBe("ジャイプール。通りで踊った夜。");
    expect(itemOutAnnouncement("三時のしおり", { description: "針が三時を指す絵のしおり。" }, "enter")).toBe("三時のしおりを取り出した。針が三時を指す絵のしおり。");
    // Nothing new: the same card, a highlight moved to no line shown, a card going or none.
    expect(itemOutAnnouncement("カムラのメモ", second, "stay")).toBe("");
    expect(itemOutAnnouncement("カムラのメモ", lines, "move")).toBe("");
    expect(itemOutAnnouncement("カムラのメモ", lines, "leave")).toBe("");
    expect(itemOutAnnouncement("カムラのメモ", lines, "none")).toBe("");
  });

  it("reaches down to the dialogue window, never below the scene, and waits hidden where not even its heading fits", () => {
    expect(itemOutFit(100, 500, 800)).toEqual({ maxHeight: 500 - ITEM_OUT_GAP_PX - 100, hidden: false });
    // No window (or one the player hid): down to the scene's foot.
    expect(itemOutFit(100, undefined, 800)).toEqual({ maxHeight: 800 - ITEM_OUT_GAP_PX - 100, hidden: false });
    expect(itemOutFit(100, 900, 800)).toEqual({ maxHeight: 800 - ITEM_OUT_GAP_PX - 100, hidden: false });
    expect(itemOutFit(100.4, 420.9, 800)).toEqual({ maxHeight: Math.floor(420.9 - ITEM_OUT_GAP_PX - 100.4), hidden: false });
    expect(itemOutFit(100, 100 + ITEM_OUT_GAP_PX + ITEM_OUT_LEAST_PX, 800)).toEqual({ maxHeight: ITEM_OUT_LEAST_PX, hidden: false });
    // A short screen's choices: the window starts above the card's heading's foot, or above the card itself.
    expect(itemOutFit(100, 100 + ITEM_OUT_GAP_PX + ITEM_OUT_LEAST_PX - 1, 800)).toEqual({ maxHeight: ITEM_OUT_LEAST_PX, hidden: true });
    expect(itemOutFit(239, 227, 568)).toEqual({ maxHeight: ITEM_OUT_LEAST_PX, hidden: true });
  });
});
