import { describe, expect, it } from "vitest";
import { searchFairness, type SearchRecord } from "../engines/search/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { nahargarhHideSeek } from "./definition";
import { HIDE_SEEK_DOORS, hideSeekRules, hideSeekSetup } from "./rules";

const record = (actions: SearchRecord["actions"], lapse: SearchRecord["lapse"] = null): SearchRecord => ({ actions, lapse });

describeMiniGameRules(nahargarhHideSeek, hideSeekRules, { records: [
  record([]), record([], "idle"), record([], "timeout"), record([{ spot: 6 }]), record([{ spot: 99 }, { button: "nope" }]),
  record([{ button: "call" }, { button: "call" }], "idle"), record([{ spot: -1 }, { spot: 1.5 }], "timeout"),
] });

describe("the hide-and-seek's rules", () => {
  const params = { hide: 7 };
  const outcome = (actions: SearchRecord["actions"], lapse: SearchRecord["lapse"] = null) => hideSeekRules.outcomeOf(record(actions, lapse), params);
  const doors = (...numbers: number[]) => numbers.map((door) => ({ spot: door - 1 }));

  it("finds her behind the 7th door: among the first two doors opened is quick, later is door by door", () => {
    expect(outcome(doors(7))).toBe("door_quick");
    expect(outcome(doors(3, 7))).toBe("door_quick");
    expect(outcome(doors(3, 4, 7))).toBe("door_by_door");
    expect(outcome(doors(1, 2, 3, 4, 5, 6, 7))).toBe("door_by_door");
    // A door opened twice counts once; an empty room does not end the play.
    expect(outcome(doors(3, 3, 7))).toBe("door_quick");
    expect(outcome(doors(1, 2, 3), "idle")).toBe("just_wait");
  });

  it("ends with the third call, whatever was opened before; two calls and nothing more is waiting", () => {
    expect(outcome([{ button: "call" }, { button: "call" }, { button: "call" }])).toBe("call_her_name");
    expect(outcome([...doors(1, 2), { button: "call" }, { button: "call" }, { button: "call" }, ...doors(7)])).toBe("call_her_name");
    expect(outcome([{ button: "call" }, { button: "call" }], "idle")).toBe("just_wait");
    expect(outcome([{ button: "call" }, ...doors(7)])).toBe("door_quick");
    expect(outcome([], "idle")).toBe("just_wait");
    expect(outcome([], "timeout")).toBe("just_wait");
  });

  it("plays 「おまかせ」 door by door from the first door to hers, as the story tells it", () => {
    expect(hideSeekRules.autoRecord("door_by_door", params)).toEqual(record(doors(1, 2, 3, 4, 5, 6, 7)));
    expect(hideSeekRules.autoRecord("door_quick", params)).toEqual(record(doors(7)));
    expect(hideSeekRules.autoRecord("door_by_door", { hide: 1 }).actions).toHaveLength(3);
  });

  it("is a fair search: nine doors, her door the tag's, time to look before waiting ends it", () => {
    for (const hide of [1, 7, HIDE_SEEK_DOORS]) expect(searchFairness(hideSeekSetup({ hide }))).toEqual([]);
    expect(hideSeekSetup({ hide: 7 }).targets).toEqual([6]);
    expect(hideSeekSetup({ hide: 40 }).targets).toEqual([HIDE_SEEK_DOORS - 1]);
    expect(nahargarhHideSeek.params({ effectIds: [], backgroundIds: [], emotionIds: [] }).parse({})).toEqual({ hide: 7 });
  });
});
