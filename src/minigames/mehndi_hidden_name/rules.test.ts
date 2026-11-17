import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { searchFairness, type SearchRecord } from "../engines/search/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { mehndiHiddenName } from "./definition";
import { searchProgress } from "../engines/search/engine";
import { MEHNDI_SPOTS, MEHNDI_TARGETS, MEHNDI_TEXTS, MEHNDI_TUNING, mehndiFairness, mehndiRules, mehndiSetup, type MehndiOutcome, type MehndiParams } from "./rules";
import { MEHNDI_HIT, MEHNDI_PLACES, MEHNDI_WRITING, mehndiNear, mehndiSpotAt } from "./marks";
import { fairness } from "./play";
import { WRITING_FONT, writingSize, writingWidth } from "./writing";

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

});

// The player's name in Latin letters in Fasol SP Demo (docs/13 2.10; the user's decisions of 2026-11-16 and 2026-11-17): the
// font declared for the letters only, its size from the font's own advances, as large as reads on a phone, smaller for a
// long name, never cut, and only ever pressed narrower.
describe("the name's writing in Fasol SP Demo", () => {
  /** The thumb's room (the narrowest of the three places), in the hand's units. */
  const ROOM = MEHNDI_WRITING.thumb.width;
  const face = readFileSync(new URL("./skin.css", import.meta.url), "utf8").match(/@font-face\s*\{([^}]*)\}/u)?.[1] ?? "";

  it("declares the bundled file, as distributed and beside its licence, for the letters A–Z, a–z and the space only", () => {
    expect(face).toContain(`font-family: "${WRITING_FONT}";`);
    // A relative url: the build bundles the file with the play's stylesheet (never a served path of public/).
    const url = face.match(/src: url\("([^"]+)"\) format\("opentype"\);/u)?.[1];
    expect(url).toBe("./fonts/FasolSPDemo.otf");
    // The demo file as JustFreeFonts.com distributes it (version 1.002; the licence lets it be shared, not changed).
    expect(createHash("sha256").update(readFileSync(new URL(url!, import.meta.url))).digest("hex"))
      .toBe("00c19e5cce5fa58a68458a6b23a4efdbb107d8af66109e2ac6b6f9950a5fc0cb");
    expect(readFileSync(new URL("./fonts/LICENSE-FasolSP.txt", import.meta.url), "utf8")).toContain("Resale is strictly prohibited");
    // The demo draws an advert in place of digits and punctuation, and a letter with marks without them: those fall back.
    expect(face.match(/unicode-range: ([^;]+);/u)?.[1]).toBe("U+0020, U+0041-005A, U+0061-007A");
    // The width table counts exactly those characters as the font's (by its advances, the rest as the fallback draws them).
    const drawn = (code: number) => code === 0x20 || (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a);
    for (let code = 0x20; code < 0x250; code += 1) {
      const { low, high } = writingWidth(String.fromCodePoint(code));
      expect(Math.abs(high / low - 1.01 / 0.9) < 1e-9, `U+${code.toString(16)}`).toBe(drawn(code));
    }
  });

  it("bounds the drawn width by the font's advances and the fallback's: every width measured in Chromium lies inside", () => {
    // Shaped widths (em) in Chromium (getComputedTextLength at 100 units, geometricPrecision, 2026-11-17): the font's
    // tightest kerning (Blblbl, Hlhlhl), its narrowest letters, kana names, long names, and names with a hyphen, an
    // apostrophe, full stops or letters with marks, those in Noto Serif JP (as index.html loads it) and in the local serif.
    const measured: [string, number, number][] = [
      ["Blblbl", 2.757, 2.757], ["Hlhlhl", 2.589, 2.589], ["Ii", 0.338, 0.338], ["Taichi", 2.351, 2.351], ["Jo", 0.72, 0.72],
      ["Masayoshi", 4.797, 4.797], ["Mmmmmmmm", 6.52, 6.52], ["Jan-Poru", 3.674, 3.661], ["O'Brien", 3.137, 3.121],
      ["Ken’ichi", 3.383, 3.484], ["J. R. Smith", 4.209, 4.055], ["Zoë", 1.611, 1.508], ["Émile", 2.479, 2.438],
      ["Øystein", 3.336, 3.291], ["Ōtani", 2.327, 2.282], ["Tsuchimochi Shintarou", 9.732, 9.732],
      ["Alexandria Konstantinopoulou", 13.052, 13.052],
    ];
    for (const [name, ...ems] of measured) {
      const { low, high } = writingWidth(name);
      for (const em of ems) {
        expect(low, name).toBeLessThanOrEqual(em);
        expect(high, name).toBeGreaterThanOrEqual(em);
      }
    }
    // One case: a capital is its small letter. A letter with marks is the fallback's (whole, with its marks).
    expect(writingWidth("TAICHI")).toEqual(writingWidth("taichi"));
    expect(writingWidth("Émile").low).toBeLessThan(writingWidth("Emile").low);
    expect(writingWidth("Émile").high).toBeGreaterThan(writingWidth("Emile").high);
    expect(writingWidth("Zoë")).toEqual(writingWidth("Zoë"));
    expect(writingWidth("n̈")).toEqual({ low: 0.2, high: 1.1 });
  });

  it("writes a short name at the largest size, and kana names of up to eight letters still large enough to read", () => {
    for (const name of ["Jo", "Yuki", "Taichi", "Haruto", "Kenichi"]) expect(writingSize(name, ROOM), name).toEqual({ fontSize: 16, squeeze: false });
    // Small letters 0.363 of the size high: 13 units makes 4.7, about 5.6 px on a 390 px phone (the palm 358 px for 300 units).
    for (const name of ["Chihiro", "Momoko", "Masaaki", "Shintaro", "Takahiro"]) {
      expect(writingSize(name, ROOM).fontSize, name).toBeGreaterThanOrEqual(13);
    }
    expect(writingSize("", ROOM)).toEqual({ fontSize: 16, squeeze: false });
  });

  it("fits every name in its room: unpressed names fit, and a pressed one is surely wider than its room (never stretched)", () => {
    const names = ["Jo", "Taichi", "Masayoshi", "Jan-Poru", "O'Brien", "Mohammed", "Mmmmmmmmmmmm", "Tsuchimochi Shintarou",
      "Alexandria Konstantinopoulou", "Fujiwara no Michinaga", "Shohei Ohtani", "Wolfgang Amadeus Mozart", "Ryu".repeat(24),
      "Øyvind Ærø-Łukasz", "J. R. R. Tolkien"];
    for (const { width } of Object.values(MEHNDI_WRITING)) for (const name of names) {
      const { fontSize, squeeze } = writingSize(name, width);
      const { low, high } = writingWidth(name);
      if (squeeze) {
        expect(fontSize, name).toBe(6);
        expect(low * fontSize, name).toBeGreaterThan(width);
      } else {
        expect(high * fontSize, name).toBeLessThanOrEqual(width + 1e-9);
        expect(fontSize, name).toBeLessThanOrEqual(16);
      }
    }
    expect(writingSize("Alexandria Konstantinopoulou", ROOM)).toEqual({ fontSize: 6, squeeze: true });
    // Too long for the smallest size but maybe not wider than the room there: a little smaller, unpressed.
    const between = writingSize("Fujiwara no Michinaga", ROOM);
    expect(between.squeeze).toBe(false);
    expect(between.fontSize).toBeLessThan(6);
    expect(between.fontSize).toBeGreaterThan(5);
  });

});
