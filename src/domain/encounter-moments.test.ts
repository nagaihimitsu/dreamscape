import { describe, expect, it } from "vitest";
import { nextInOrder, visitOrder, visitSlot, type MomentEntry } from "./encounter-moments";

// The order of a landmark visit's encounters (the unified event design, stage 1), on small
// fictional content: two landmarks, encounters before, while observing and after the main part.
const entries: MomentEntry[] = [
  { encounterId: "late_after", landmarkId: "tower", storyId: "encounters/a_late", priority: 2 },
  { encounterId: "json_second", landmarkId: "tower", storyId: "encounters/z_json" },
  { encounterId: "first_before", landmarkId: "tower", storyId: "encounters/m_first", priority: -2 },
  { encounterId: "b_before", landmarkId: "tower", storyId: "encounters/b_same", priority: -1 },
  { encounterId: "a_before", landmarkId: "tower", storyId: "encounters/a_same", priority: -1 },
  { encounterId: "json_first", landmarkId: "tower", storyId: "encounters/y_json" },
  { encounterId: "observe_tagged", landmarkId: "tower", storyId: "encounters/c_tagged", priority: "after observe" },
  { encounterId: "soon_after", landmarkId: "tower", storyId: "encounters/z_soon", priority: 1 },
  { encounterId: "elsewhere", landmarkId: "market", storyId: "encounters/a_market", priority: -1 },
];

describe("the order of a landmark visit's encounters", () => {
  it.each([
    [undefined, "observe"], ["after observe", "observe"], [-3, "before"], [-1, "before"], [1, "after"], [10, "after"],
  ] as const)("puts priority %s in the %s slot", (priority, slot) => {
    expect(visitSlot(priority)).toBe(slot);
  });

  it.each([
    // Smaller first; the same priority in story file-name order (a_same before b_same), whatever the catalog order.
    ["tower", "before", ["first_before", "a_before", "b_before"]],
    // Rules without a priority keep the catalog order; head-tagged `after observe` ones follow by file name.
    ["tower", "observe", ["json_second", "json_first", "observe_tagged"]],
    ["tower", "after", ["soon_after", "late_after"]],
    ["market", "before", ["elsewhere"]],
    ["market", "after", []],
  ] as const)("orders %s's %s encounters", (landmarkId, slot, expected) => {
    expect(visitOrder(entries, landmarkId, slot)).toEqual(expected);
  });

  it.each([
    // From the start, the first that can run now; after one, only those after it (a skipped one never comes back).
    [undefined, [], "first_before"],
    [undefined, ["first_before"], "a_before"],
    ["first_before", [], "a_before"],
    ["a_before", ["b_before"], undefined],
    ["b_before", [], undefined],
    // An encounter that is not in the order continues nothing.
    ["soon_after", [], undefined],
  ] as const)("goes on after %s (refusing %o) with %s", (afterId, refused, expected) => {
    const order = visitOrder(entries, "tower", "before");
    expect(nextInOrder(order, afterId, (id) => !(refused as readonly string[]).includes(id))).toBe(expected);
  });
});
