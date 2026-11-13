import { searchRules, type SearchGame, type SearchSetup } from "../engines/search/engine";

// The hidden name's rules (docs/13 2.4): a search skin. Her palm has a few places the eye stops at (MEHNDI_SPOTS); one of
// them hides what was written there (the tag's `target`, chosen by the Jal Mahal date's flags through cond()). Pointing at
// it is found; pointing at another is a wrong spot (the play ends: she tells you); 「明日にする」 is later. There is no time
// limit and no idle limit (user decision 2026-11-13: the player looks as long as they like, and 「逃げたね」 follows only
// their own 「明日にする」). Nothing is random. Pure.

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
export function mehndiSetup(params: MehndiParams): SearchSetup {
  return {
    spots: MEHNDI_SPOTS.length,
    targets: [MEHNDI_SPOTS.indexOf(params.target)],
    // Pointing is saying 「ここ」: a wrong place ends the look (she says it is only a petal), then the story shows it.
    wrongEnds: true,
    buttons: [{ id: "later", presses: 1 }],
    // Only finding the place, a wrong place or 「明日にする」 ends the look (2026-11-13).
    timeLimitMs: null,
    idleMs: null,
  };
}

export const mehndiGame: SearchGame<MehndiParams, MehndiOutcome> = {
  setup: mehndiSetup,
  outcome: (ending) => {
    switch (ending.kind) {
      case "found": return "found";
      case "wrong": return "wrong_spot";
      // 「明日にする」. A lapse never ends this play (no time or idle limit); a record that stops with nothing reads as later.
      case "button":
      case "timeout":
      case "idle": return "later";
    }
  },
  auto: (outcome) => {
    switch (outcome) {
      case "found": return { kind: "found", misses: 0 };
      case "wrong_spot": return { kind: "wrong" };
      case "later": return { kind: "button", button: "later" };
    }
  },
};

export const mehndiRules = searchRules(mehndiGame);
