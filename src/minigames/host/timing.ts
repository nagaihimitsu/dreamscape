// The host's moments (docs/13 2.6), in a light module of their own: the host, the Debug room and the E2E helpers read them.

/** After the line is shown, the start waits this long (the choices' guard: a tap that showed the line is not a start). */
export const MINI_GAME_CHOICE_GUARD_MS = 300;
/** Input this soon after a play starts without the host's count (countdown "own" or "none") is the start button's second tap: dropped. */
export const MINI_GAME_START_GUARD_MS = 450;

/** The host's count (countdown "host"): 「3」「2」「1」 this long each; the clock starts on 「スタート！」. */
export const MINI_GAME_COUNT_STEP_MS = 300;
/** The count before the clock starts: 3・2・1. */
export const MINI_GAME_COUNT_MS = 3 * MINI_GAME_COUNT_STEP_MS;
/** 「スタート！」 stays this long after the clock has started (play goes on under it). */
export const MINI_GAME_GO_MS = 300;

/** The finish word (「そこまで！」) stays this long; the result card comes after it or after the play's hold, whichever is later. */
export const MINI_GAME_FINISH_MS = 500;
/** The result card drops every press this long after it shows (a finger still tapping the play does not skip it). */
export const MINI_GAME_RESULT_GUARD_MS = 450;
/** The result card takes its 「次へ」 by itself after this long (only when it offers nothing else: no practice, no retry). */
export const MINI_GAME_RESULT_MS = 2500;
/** The result card's ★ come one by one, this far apart. */
export const MINI_GAME_STAR_STEP_MS = 120;
/** The result card's score counts up from 0 over this long. */
export const MINI_GAME_SCORE_COUNT_MS = 400;

/** The host's finish does not vibrate this soon after the play's own vibration (nor the play this soon after the finish's). */
export const MINI_GAME_VIBRATE_GAP_MS = 100;

/** The heroine's reaction (react) stays this long … */
export const MINI_GAME_REACT_MS = 900;
/** … and comes at most once in this long (more is noise). */
export const MINI_GAME_REACT_GAP_MS = 1500;
