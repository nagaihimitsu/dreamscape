import { describe, expect, it } from "vitest";
import { searchFairness, type SearchRecord } from "../engines/search/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { mehndiHiddenName } from "./definition";
import { searchProgress } from "../engines/search/engine";
import { MEHNDI_SPOTS, MEHNDI_TARGETS, MEHNDI_TEXTS, MEHNDI_WRONG_LIMIT, mehndiRules, mehndiSetup, type MehndiOutcome, type MehndiParams } from "./rules";
import { MEHNDI_HIT, MEHNDI_PLACES, mehndiSpotAt, writingSize } from "./Skin";

const record = (actions: SearchRecord["actions"], lapse: SearchRecord["lapse"] = null): SearchRecord => ({ actions, lapse });
const spot = (name: (typeof MEHNDI_SPOTS)[number]) => ({ spot: MEHNDI_SPOTS.indexOf(name) });

describeMiniGameRules(mehndiHiddenName, mehndiRules, { records: [
  record([]), record([], "timeout"), record([], "idle"), record([{ spot: 0 }]), record([{ spot: 40 }, { button: "call" }]),
  record([{ button: "later" }]), record([{ spot: 3 }, { spot: 2 }], "timeout"), record([{ spot: 0 }, { spot: 1 }, { spot: 2 }]),
] });

describe("the hidden name's rules", () => {
  const thumb: MehndiParams = { target: "thumb", text: "player" };
  const outcome = (actions: SearchRecord["actions"], lapse: SearchRecord["lapse"] = null, params = thumb) => mehndiRules.outcomeOf(record(actions, lapse), params);

  it("finds the writing where the tag hid it first; after a wrong point the look goes on, and finding it is a wrong spot", () => {
    expect(outcome([spot("thumb")])).toBe("found");
    // One or two wrong points: the look goes on (a record that stops there reads as 「明日にする」, never sent by the play).
    expect(mehndiRules.outcomeOf(record([spot("peacock")]), thumb)).toBe("later");
    expect(outcome([spot("peacock"), spot("thumb")])).toBe("wrong_spot");
    expect(outcome([spot("peacock"), spot("index"), spot("thumb")])).toBe("wrong_spot");
    // The same petal twice is one wrong point; the third wrong point ends the look.
    expect(outcome([spot("peacock"), spot("peacock"), spot("thumb")])).toBe("wrong_spot");
    expect(outcome([spot("peacock"), spot("index"), spot("wrist"), spot("thumb")])).toBe("wrong_spot");
    expect(searchProgress([spot("peacock"), spot("index"), spot("wrist")], mehndiSetup(thumb)).ending)
      .toEqual({ kind: "wrong", spot: MEHNDI_SPOTS.indexOf("wrist"), misses: 2, helped: 0 });
    expect(MEHNDI_WRONG_LIMIT).toBe(3);
    expect(outcome([spot("peacock")], null, { target: "peacock", text: "illegible" })).toBe("found");
    expect(outcome([spot("vine")], null, { target: "vine", text: "farhana" })).toBe("found");
  });

  it("leaves it for tomorrow only with 「明日にする」: no time limit and no idle limit end the look (2026-11-13)", () => {
    expect(outcome([{ button: "later" }])).toBe("later");
    expect(outcome([{ button: "later" }, spot("thumb")])).toBe("later");
    for (const target of MEHNDI_TARGETS) expect(mehndiSetup({ target, text: "player" })).toMatchObject({ timeLimitMs: null, idleMs: null });
    expect(mehndiHiddenName.timed).toBe(false);
    // A record with a lapse cannot come from a play now; the rules still read it (as later) rather than fail.
    expect(outcome([], "timeout")).toBe("later");
  });

  it("plays 「おまかせ」 by the player's own acts: the place, a wrong place then the place, or 「明日にする」, never by waiting", () => {
    const plans: Record<MehndiOutcome, SearchRecord> = {
      found: record([spot("thumb")]),
      wrong_spot: record([spot("index"), spot("thumb")]),
      later: record([{ button: "later" }]),
    };
    for (const item of mehndiHiddenName.outcomes) expect(mehndiRules.autoRecord(item.id as MehndiOutcome, thumb), item.id).toEqual(plans[item.id as MehndiOutcome]);
  });

  it("is a fair search for every target: the writing at one of six places", () => {
    for (const target of MEHNDI_TARGETS) expect(searchFairness(mehndiSetup({ target, text: "player" }))).toEqual([]);
    const schema = mehndiHiddenName.params({ effectIds: [], backgroundIds: [], emotionIds: [] });
    for (const target of MEHNDI_TARGETS) for (const text of MEHNDI_TEXTS) expect(() => schema.parse({ target, text })).not.toThrow();
    expect(() => schema.parse({ target: "palm", text: "player" })).toThrow();
    expect(schema.parse({})).toEqual({ target: "thumb", text: "player" });
  });
});

describe("the hidden name's field", () => {
  it("points at a place only near it, and the places are apart from each other", () => {
    expect(mehndiSpotAt(214, 298)).toBe(MEHNDI_SPOTS.indexOf("thumb"));
    expect(mehndiSpotAt(214 + MEHNDI_HIT - 1, 298)).toBe(MEHNDI_SPOTS.indexOf("thumb"));
    expect(mehndiSpotAt(20, 20)).toBeNull();
    // A wider reach (a finger on a small palm) takes the nearest place, never a farther one.
    expect(mehndiSpotAt(214 - 20, 298 + 20, 60)).toBe(MEHNDI_SPOTS.indexOf("thumb"));
    expect(mehndiSpotAt(145, 295, 60)).toBe(MEHNDI_SPOTS.indexOf("vine"));
    const places = Object.values(MEHNDI_PLACES);
    for (const a of places) for (const b of places) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.labelJa}–${b.labelJa}`).toBeGreaterThan(MEHNDI_HIT * 2);
  });

  it("writes the name as typed, smaller for a long one, never cut", () => {
    expect(writingSize("Aki", 60)).toEqual({ fontSize: 11, squeeze: false });
    expect(writingSize("ひなた", 60)).toEqual({ fontSize: 11, squeeze: false });
    const longer = writingSize("Alexandria", 60);
    expect(longer.fontSize).toBeLessThan(11);
    expect(longer.fontSize * 10 * 0.62).toBeCloseTo(60);
    expect(writingSize("Alexandria Konstantinopoulou", 60)).toEqual({ fontSize: 4.5, squeeze: true });
    expect(writingSize("あ".repeat(40), 60)).toEqual({ fontSize: 4.5, squeeze: true });
  });
});
