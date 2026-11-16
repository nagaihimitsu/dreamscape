import { describe, expect, it, vi } from "vitest";
import { searchFairness, type SearchRecord } from "../engines/search/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { mehndiHiddenName } from "./definition";
import { searchProgress } from "../engines/search/engine";
import { MEHNDI_SPOTS, MEHNDI_TARGETS, MEHNDI_TEXTS, MEHNDI_TUNING, mehndiFairness, mehndiRules, mehndiSetup, type MehndiOutcome, type MehndiParams } from "./rules";
import { MEHNDI_HIT, MEHNDI_PLACES, mehndiLoops, mehndiNear, mehndiSpotAt } from "./Skin";
import { fairness } from "./play";
import { WRITING_FONT, warmWritingFont, writingSize, writingWidth } from "./writing";

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
    // The same petal twice is one wrong point; wrong points never end the look (from the third she only hints the area:
    // the find is always the player's, as the story says).
    expect(outcome([spot("peacock"), spot("peacock"), spot("thumb")])).toBe("wrong_spot");
    expect(outcome([spot("peacock"), spot("index"), spot("wrist"), spot("thumb")])).toBe("wrong_spot");
    expect(searchProgress([spot("peacock"), spot("index"), spot("wrist"), spot("pinky"), spot("vine")], mehndiSetup(thumb)).ending).toBeNull();
    expect(outcome([spot("peacock"), spot("index"), spot("wrist"), spot("pinky"), spot("vine"), spot("thumb")])).toBe("wrong_spot");
    expect(mehndiSetup(thumb).wrongLimit).toBeNull();
    expect(MEHNDI_TUNING.hintAfter).toBe(3);
    expect(outcome([spot("peacock")], null, { target: "peacock", text: "illegible" })).toBe("found");
    expect(outcome([spot("vine")], null, { target: "vine", text: "farhana" })).toBe("found");
  });

  it("leaves it for tomorrow only with 「明日にする」: no time limit and no idle limit end the look (2026-11-13)", () => {
    expect(outcome([{ button: "later" }])).toBe("later");
    expect(outcome([{ button: "later" }, spot("thumb")])).toBe("later");
    for (const target of MEHNDI_TARGETS) expect(mehndiSetup({ target, text: "player" })).toMatchObject({ timeLimitMs: null, idleMs: null });
    expect(mehndiHiddenName.timed).toBe(false);
    // No time on its card, and the scene's own music (a quiet night for two) goes on.
    expect(mehndiHiddenName.durationSec).toBeUndefined();
    expect(mehndiHiddenName.music).toBe("scene");
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

  it("curls her fingers only with the lamp near the writing's place, never nearer another place", () => {
    for (const target of MEHNDI_TARGETS) {
      const writingPlace = MEHNDI_PLACES[target];
      expect(mehndiNear(writingPlace.x, writingPlace.y, target), target).toBe(true);
      for (const spot of MEHNDI_SPOTS) if (spot !== target) expect(mehndiNear(MEHNDI_PLACES[spot].x, MEHNDI_PLACES[spot].y, target), `${target} at ${spot}`).toBe(false);
      // Wherever her hand tells, the lamp is nearer the place to point at than any other (a point under it finds the writing).
      for (let x = 0; x <= 300; x += 4) for (let y = 0; y <= 420; y += 4) {
        if (!mehndiNear(x, y, target)) continue;
        const own = Math.hypot(writingPlace.x - x, writingPlace.y - y);
        for (const spot of MEHNDI_SPOTS) if (spot !== target) expect(Math.hypot(MEHNDI_PLACES[spot].x - x, MEHNDI_PLACES[spot].y - y), `${target} at ${x},${y}`).toBeGreaterThan(own);
      }
    }
    expect(mehndiNear(150, 60, "thumb")).toBe(false);
    // The 2026-11-14 playtest: with the lamp at (180, 330), nearer the central vine, her hand curled for the thumb's writing.
    expect(mehndiNear(180, 330, "thumb")).toBe(false);
  });

  it("calls a tuning misleading where the pool lights the palm, her hand curls at the next place, or she teases a pause", () => {
    expect(mehndiFairness(MEHNDI_TUNING)).toEqual([]);
    expect(fairness(MEHNDI_TUNING)).toEqual([]);
    expect(mehndiFairness({ ...MEHNDI_TUNING, lampPct: 30 }).join()).toContain("lampPct 30");
    expect(mehndiFairness({ ...MEHNDI_TUNING, nearUnits: 80 }).join()).toContain("nearUnits 80");
    expect(mehndiFairness({ ...MEHNDI_TUNING, nearUnits: 46 }).join()).toContain("nearUnits 46");
    expect(mehndiFairness({ ...MEHNDI_TUNING, lingerMs: 300 }).join()).toContain("lingerMs 300");
  });

  it("draws the curls that look like writing as loops only (well-formed paths, no letters)", () => {
    for (const loops of [3, 4, 5]) expect(mehndiLoops(loops, 6, 6)).toMatch(/^M-?[\d.]+ 0( c[-\d. ]+)+$/u);
  });

});

// The player's name in Latin letters in Playwrite IN (docs/13 2.10; the user's decision of 2026-11-16): its size from the
// font's own advances, as large as reads on a phone, smaller for a long name, never cut, and only ever pressed narrower.
describe("the name's cursive writing", () => {
  /** The thumb's room (the narrowest of the three places), in the hand's units. */
  const ROOM = 54;

  it("bounds the joined hand's width by the font's advances: every width measured in Chromium lies inside", () => {
    // Shaped widths (em) of the bundled font in Chromium (getComputedTextLength at 100 px, 2026-11-16): the narrowest and
    // widest against the advances' sum among 125 names, and two long ones.
    const measured: [string, number][] = [
      ["Ty", 1.36], ["Mei", 2.26], ["Kei", 1.84], ["Taichi", 3.21], ["Jo", 1.22], ["Mmmmmmmm", 9.14], ["Hiiiiiii", 3.5],
      ["Ōtani", 3.19], ["Émile", 3.12], ["Tsuchimochi Shintarou", 12.81], ["Alexandria Konstantinopoulou", 16.79],
    ];
    for (const [name, em] of measured) {
      const { low, high } = writingWidth(name);
      expect(low, name).toBeLessThanOrEqual(em);
      expect(high, name).toBeGreaterThanOrEqual(em);
    }
    // A letter with marks counts as its letter; one the table does not know, as anything from the narrowest to the widest.
    expect(writingWidth("Émile")).toEqual(writingWidth("Emile"));
    expect(writingWidth("Øystein").low).toBeLessThan(writingWidth("Oystein").low);
    expect(writingWidth("Øystein").high).toBeGreaterThan(writingWidth("Oystein").high);
  });

  it("writes a short name at the largest size, and kana names of up to eight letters still large enough to read", () => {
    for (const name of ["Jo", "Yuki", "Taichi"]) expect(writingSize(name, ROOM), name).toEqual({ fontSize: 12, squeeze: false });
    // An x-height of half the size: 5 units is about 6 px on a 390 px phone (the palm 358 px for 300 units).
    for (const name of ["Haruto", "Chihiro", "Kenichi", "Momoko", "Masaaki", "Shintaro", "Takahiro"]) {
      expect(writingSize(name, ROOM).fontSize, name).toBeGreaterThanOrEqual(10);
    }
    expect(writingSize("", ROOM)).toEqual({ fontSize: 12, squeeze: false });
  });

  it("fits every name in its room: unpressed names fit, and a pressed one is surely wider than its room (never stretched)", () => {
    const names = ["Jo", "Taichi", "Masayoshi", "Mohammed", "Mmmmmmmmmmmm", "Tsuchimochi Shintarou", "Alexandria Konstantinopoulou",
      "Fujiwara no Michinaga", "Shohei Ohtani", "Wolfgang Amadeus Mozart", "Ryu".repeat(24), "Øyvind Ærø-Łukasz"];
    for (const width of [54, 58, 62]) for (const name of names) {
      const { fontSize, squeeze } = writingSize(name, width);
      const { low, high } = writingWidth(name);
      if (squeeze) {
        expect(fontSize, name).toBe(4.5);
        expect(low * fontSize, name).toBeGreaterThan(width);
      } else {
        expect(high * fontSize, name).toBeLessThanOrEqual(width + 1e-9);
        expect(fontSize, name).toBeLessThanOrEqual(12);
      }
    }
    expect(writingSize("Alexandria Konstantinopoulou", ROOM)).toEqual({ fontSize: 4.5, squeeze: true });
    // Too long for the smallest size but maybe not wider than the room there: a little smaller, unpressed.
    const between = writingSize("Tsuchimochi Shintarou", ROOM);
    expect(between.squeeze).toBe(false);
    expect(between.fontSize).toBeLessThan(4.5);
    expect(between.fontSize).toBeGreaterThan(4);
  });

  it("starts loading the font as the play loads, and never throws when it cannot", async () => {
    const load = vi.fn((_font: string, _text?: string) => Promise.resolve([] as FontFace[]));
    warmWritingFont({ load });
    expect(load).toHaveBeenCalledWith(`12px "${WRITING_FONT}"`, "Aa");
    warmWritingFont({ load: () => Promise.reject(new Error("offline")) });
    expect(() => warmWritingFont({ load: () => { throw new Error("no fonts API"); } })).not.toThrow();
    expect(() => warmWritingFont(undefined)).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
