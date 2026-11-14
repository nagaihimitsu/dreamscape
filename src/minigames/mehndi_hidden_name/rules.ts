import { searchRules, type SearchGame, type SearchSetup } from "../engines/search/engine";

// The hidden name's rules (docs/13 2.4): a search skin. Her palm has a few places the eye stops at (MEHNDI_SPOTS); one of
// them hides what was written there (the tag's `target`, chosen by the Jal Mahal date's flags through cond()). Pointing at
// it first is found. Pointing at another is a wrong spot: she says it is only a petal, and the look goes on; finding the
// writing after that is still `wrong_spot` (the story then remembers the wrong point), and a third wrong point ends the
// look as `wrong_spot` too (she shows where it is). 「明日にする」 is later. There is no time limit and no idle limit (user
// decision 2026-11-13: the player looks as long as they like, and 「逃げたね」 follows only their own 「明日にする」).
// Nothing is random. Pure.

export type MehndiOutcome = "found" | "wrong_spot" | "later";
/** Where the writing hides, and what it is (2.10: the name as typed; an illegible mark where the story says Hindi letters). */
export type MehndiTarget = "thumb" | "peacock" | "vine";
export type MehndiText = "player" | "illegible" | "farhana";
export interface MehndiParams {
  target: MehndiTarget;
  text: MehndiText;
}

/** The places on her palm, in the field's order (and Tab's): each a spot of the search. */
export const MEHNDI_SPOTS = ["index", "pinky", "peacock", "thumb", "vine", "wrist"] as const;
export type MehndiSpot = (typeof MEHNDI_SPOTS)[number];
export const MEHNDI_TARGETS: readonly MehndiTarget[] = ["thumb", "peacock", "vine"];
export const MEHNDI_TEXTS: readonly MehndiText[] = ["player", "illegible", "farhana"];
/** The hidden name's numbers (E1; Debug's room may change them for its next play). */
export type MehndiTuning = {
  /**
   * The wrong point that ends the look (2026-11-13 playtest: a first tap to light a flower ended it at once, while the
   * story said 「もっとちゃんと見て」): two wrong points are looks with her word, the third ends it.
   */
  wrongLimit: number;
};
export const MEHNDI_TUNING: MehndiTuning = { wrongLimit: 3 };
export const MEHNDI_WRONG_LIMIT = MEHNDI_TUNING.wrongLimit;
export const mehndiSetupFor = (tuning: MehndiTuning) => (params: MehndiParams): SearchSetup => ({
  rounds: [{ spots: MEHNDI_SPOTS.length, targets: [MEHNDI_SPOTS.indexOf(params.target)] }],
  // Pointing is saying 「ここ」: she answers a wrong place, and the last one ends the look (never more than there are).
  wrongLimit: Math.min(MEHNDI_SPOTS.length - 1, Math.max(1, Math.round(tuning.wrongLimit))),
    buttons: [{ id: "later", presses: 1, ends: "play" }],
  // Only finding the place, the third wrong place or 「明日にする」 ends the look (2026-11-13).
  timeLimitMs: null,
  idleMs: null,
  idleEnds: "play",
});
export const mehndiSetup = mehndiSetupFor(MEHNDI_TUNING);

export const mehndiGameFor = (tuning: MehndiTuning): SearchGame<MehndiParams, MehndiOutcome> => ({
  setup: mehndiSetupFor(tuning),
  outcome: (ending) => {
    switch (ending.kind) {
      // Found first time; after a wrong point, the story remembers it (wrong_spot, in the past tense).
      case "found": return ending.misses === 0 ? "found" : "wrong_spot";
      case "wrong": return "wrong_spot";
      // 「明日にする」. A lapse never ends this play (no time or idle limit); a record that stops with nothing reads as later.
      // There is one round, nothing to be helped through; were there, the writing was shown, as after wrong points.
      case "helped": return "wrong_spot";
      case "button":
      case "timeout":
      case "idle": return "later";
    }
  },
  auto: (outcome) => {
    switch (outcome) {
      case "found": return { kind: "found", misses: 0 };
      // A petal pointed at first, then the writing (the story's 「最初に…」).
      case "wrong_spot": return { kind: "found", misses: 1 };
      case "later": return { kind: "button", button: "later" };
    }
  },
});
export const mehndiGame = mehndiGameFor(MEHNDI_TUNING);
export const mehndiRulesFor = (tuning: MehndiTuning) => searchRules(mehndiGameFor(tuning));
export const mehndiRules = mehndiRulesFor(MEHNDI_TUNING);
