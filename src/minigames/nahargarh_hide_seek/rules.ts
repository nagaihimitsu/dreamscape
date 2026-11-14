import { searchRules, type SearchGame, type SearchSetup } from "../engines/search/engine";

// The hide-and-seek's rules (docs/13 2.4): a search skin. She hides behind one door of a row of identical ones (the tag's
// `hide`, the 7th in the Nahargarh date: 「七つ目の扉」). The play ends at what the player did: opened her door (within two
// doors, or after more), called her name a third time, or did nothing at all for a while (only before opening a door or
// calling: a player who stops to think after that is still searching, and the field gives a hint instead). The outcomes
// are how the player chose to search, not skill: no rating. Nothing is random. Pure.

export type HideSeekOutcome = "call_her_name" | "door_by_door" | "door_quick" | "just_wait";
export interface HideSeekParams {
  /** Her door, counted from the first (1 to HIDE_SEEK_DOORS). */
  hide: number;
}

/** The row of doors the corridor shows (not a count of the palace's suites: the field shows a stretch of corridor). */
export const HIDE_SEEK_DOORS = 12;
/** Her door when the tag names none: 「七つ目の扉」. */
export const HIDE_SEEK_DEFAULT_DOOR = 7;

/** The hide-and-seek's numbers (E1; Debug's room may change them for its next play). */
export type HideSeekTuning = {
  /** The calls that end the play: on the third, the story takes over (it tells who answers, and when). */
  calls: number;
  /** Doing nothing this long, before opening a door or calling, ends the play: she peeks out. */
  idleMs: number;
  /** After the first door or call, doing nothing this long brings a hint at her door (a giggle, its handles); again after as long. */
  hintMs: number;
  /** Her door among the first this many opened: door_quick; later: door_by_door. */
  quickDoors: number;
};
export const HIDE_SEEK_TUNING: HideSeekTuning = { calls: 3, idleMs: 9000, hintMs: 6000, quickDoors: 2 };
export const HIDE_SEEK_CALLS = HIDE_SEEK_TUNING.calls;
export const HIDE_SEEK_IDLE_MS = HIDE_SEEK_TUNING.idleMs;
export const HIDE_SEEK_HINT_MS = HIDE_SEEK_TUNING.hintMs;
export const HIDE_SEEK_QUICK_DOORS = HIDE_SEEK_TUNING.quickDoors;

export function hideSeekSetupFor(tuning: HideSeekTuning) {
  return (params: HideSeekParams): SearchSetup => ({
    rounds: [{ spots: HIDE_SEEK_DOORS, targets: [Math.min(HIDE_SEEK_DOORS, Math.max(1, Math.trunc(params.hide))) - 1] }],
    // An empty room is no end: the player opens the next door.
    wrongLimit: null,
    buttons: [{ id: "call", presses: Math.max(1, Math.round(tuning.calls)), ends: "play" }],
    timeLimitMs: null,
    idleMs: Math.max(1, Math.round(tuning.idleMs)),
    // Waiting is a way to play only for one who has not started searching (2026-11-13 playtest: a player who opened doors
    // and stopped to think was told 「探してくれないの？」).
    idleEnds: "before_action",
  });
}
export const hideSeekSetup = hideSeekSetupFor(HIDE_SEEK_TUNING);

export function hideSeekGameFor(tuning: HideSeekTuning): SearchGame<HideSeekParams, HideSeekOutcome> {
  const setup = hideSeekSetupFor(tuning);
  return {
    setup,
    outcome: (ending) => {
      switch (ending.kind) {
        case "found": return ending.misses < tuning.quickDoors ? "door_quick" : "door_by_door";
        case "button": return "call_her_name";
        case "timeout":
        case "idle": return "just_wait";
        // An empty room does not end this play (no wrong limit), nor is there a round to be helped through; were they to,
        // the player was opening doors one by one.
        case "wrong":
        case "helped": return "door_by_door";
      }
    },
    auto: (outcome, params) => {
      switch (outcome) {
        case "call_her_name": return { kind: "button", button: "call" };
        // From the first door to hers, as the story tells it (「七つ目の扉を開けたとき」).
        case "door_by_door": return { kind: "found", misses: Math.max(tuning.quickDoors, setup(params).rounds[0].targets[0]) };
        case "door_quick": return { kind: "found", misses: 0 };
        case "just_wait": return { kind: "idle" };
      }
    },
  };
}
export const hideSeekGame = hideSeekGameFor(HIDE_SEEK_TUNING);
export const hideSeekRulesFor = (tuning: HideSeekTuning) => searchRules(hideSeekGameFor(tuning));
export const hideSeekRules = hideSeekRulesFor(HIDE_SEEK_TUNING);
