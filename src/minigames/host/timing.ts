// The host's moments (docs/13 2.6), in a light module of their own: the host, the Debug room and the E2E helpers read them.

/** After the line is shown, the start waits this long (the choices' guard: a tap that showed the line is not a start). */
export const MINI_GAME_CHOICE_GUARD_MS = 300;
/** Input this soon after the start is the start button's second tap: dropped. */
export const MINI_GAME_START_GUARD_MS = 450;
/** How long the outcome's label stays before its choice is taken (a tap takes it at once). */
export const MINI_GAME_RESULT_MS = 1300;
