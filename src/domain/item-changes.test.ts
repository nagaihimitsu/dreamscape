import { describe, expect, it } from "vitest";
import { gainedItemIds, heldItemIds, spentItemIds } from "./item-changes";

describe("the held items' changes", () => {
  it("lists the items held now", () => {
    expect(heldItemIds({})).toEqual([]);
    expect(heldItemIds({ charm: "held", tea: "gifted", map: "left_behind", note: "held", ticket: "used" })).toEqual(["charm", "note"]);
  });

  it("finds the items gained: held now, not before", () => {
    expect(gainedItemIds({}, { charm: "held" })).toEqual(["charm"]);
    expect(gainedItemIds({ charm: "held" }, { charm: "held", note: "held" })).toEqual(["note"]);
    expect(gainedItemIds({ charm: "held" }, { charm: "held" })).toEqual([]);
    // Given away or left behind is no gain.
    expect(gainedItemIds({ charm: "held" }, { charm: "gifted", map: "left_behind" })).toEqual([]);
  });

  it("finds the items given away or used, not those a departure left behind", () => {
    expect(spentItemIds({ charm: "held", tea: "held" }, { charm: "gifted", tea: "used" })).toEqual(["charm", "tea"]);
    expect(spentItemIds({ charm: "held", map: "held" }, { charm: "left_behind", map: "held" })).toEqual([]);
    // An item given away before is not given again.
    expect(spentItemIds({ charm: "gifted" }, { charm: "gifted" })).toEqual([]);
    expect(spentItemIds({}, { charm: "used" })).toEqual([]);
  });
});
