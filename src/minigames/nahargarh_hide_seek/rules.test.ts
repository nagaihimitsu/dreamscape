import { describe, expect, it } from "vitest";
import { searchFairness, type SearchRecord } from "../engines/search/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { nahargarhHideSeek } from "./definition";
import { HIDE_SEEK_DOORS, HIDE_SEEK_HINT_MS, HIDE_SEEK_IDLE_MS, hideSeekRules, hideSeekSetup } from "./rules";
import { searchProgress } from "../engines/search/engine";

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
    expect(outcome(doors(12, 11, 10, 7))).toBe("door_by_door");
  });

  it("ends with waiting only before the first door or call: after that, doing nothing is a hint, never an end", () => {
    const setup = hideSeekSetup(params);
    expect(setup.idleEnds).toBe("before_action");
    expect(searchProgress([{ idle: true }], setup).ending).toEqual({ kind: "idle", misses: 0, helped: 0 });
    expect(searchProgress([...doors(1, 2, 3), { idle: true }, { idle: true }], setup).ending).toBeNull();
    expect(searchProgress([{ button: "call" }, { idle: true }], setup).ending).toBeNull();
    // The play goes on after a pause: her door still ends it as the doors opened say.
    expect(outcome([...doors(1, 2, 3), { idle: true }, ...doors(7)])).toBe("door_by_door");
    expect(outcome([...doors(4), { idle: true }, ...doors(7)])).toBe("door_quick");
    // The hint comes before waiting could end an unstarted play, and both leave time to look.
    expect(HIDE_SEEK_HINT_MS).toBeLessThan(HIDE_SEEK_IDLE_MS);
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

  it("is a fair search: twelve doors, her door the tag's (the 7th by default), time to look before waiting ends it", () => {
    expect(HIDE_SEEK_DOORS).toBe(12);
    for (const hide of [1, 7, HIDE_SEEK_DOORS]) expect(searchFairness(hideSeekSetup({ hide }))).toEqual([]);
    expect(hideSeekSetup({ hide: 7 }).rounds[0].targets).toEqual([6]);
    expect(hideSeekSetup({ hide: 40 }).rounds[0].targets).toEqual([HIDE_SEEK_DOORS - 1]);
    expect(nahargarhHideSeek.params({ effectIds: [], backgroundIds: [], emotionIds: [] }).parse({})).toEqual({ hide: 7 });
  });
});
