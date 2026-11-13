// The cricket batting mini-game's rules (`# minigame: cricket_batting`, src/content/mini-games.ts): one ball, one tap.
// The outcome comes from when the player swings, against when the ball reaches the bat; nothing is random (the taped
// ball's wobble on screen is drawn the same way every time and changes nothing). Times are milliseconds from the
// start of the play (the press of 「構える」). Pure: the screen (src/features/minigame/CricketBatting.tsx) draws and times.

export type CricketOutcome = "six" | "over_wall" | "edge" | "bowled" | "no_swing";

/** The play's moments. Generous windows: a phone's tap has its own lag, and the game is a moment of the story. */
export const CRICKET_TIMING = {
  /** Before her run-up: the player sees the pitch, the meter and the button. */
  settleMs: 600,
  /** Her short run-up, to the ball leaving her hand. */
  runUpMs: 1100,
  /** From her hand to the bat (one bounce on the way, at `bounceAt` of it). */
  flightMs: 1000,
  bounceAt: 0.6,
  /** A swing this close to the ball's arrival, early or late, hits it clean: six. */
  cleanMs: 85,
  /** A little early (cleanMs to nearMs before): pulled over the wall. A little late: off the edge. Further: a miss. */
  nearMs: 210,
  /** After the ball's arrival, the ball reaches the bricks behind the bat (a ball not hit knocks them down then). */
  bricksMs: 260,
  /** After the ball's arrival, a play without a swing ends: no swing. */
  noSwingMs: 650,
} as const;

/** When the ball leaves her hand, and when it reaches the bat (from the start of the play). */
export const CRICKET_RELEASE_MS = CRICKET_TIMING.settleMs + CRICKET_TIMING.runUpMs;
export const CRICKET_CONTACT_MS = CRICKET_RELEASE_MS + CRICKET_TIMING.flightMs;
/** When a play without a swing ends. */
export const CRICKET_END_MS = CRICKET_CONTACT_MS + CRICKET_TIMING.noSwingMs;

/** The outcome of a play: the swing's time (null: no swing before CRICKET_END_MS). */
export function cricketOutcome(swingMs: number | null): CricketOutcome {
  if (swingMs === null || !Number.isFinite(swingMs) || swingMs > CRICKET_END_MS) return "no_swing";
  const off = swingMs - CRICKET_CONTACT_MS;
  if (Math.abs(off) <= CRICKET_TIMING.cleanMs) return "six";
  if (off < 0 && -off <= CRICKET_TIMING.nearMs) return "over_wall";
  if (off > 0 && off <= CRICKET_TIMING.nearMs) return "edge";
  return "bowled";
}

/** When 「おまかせ」 swings to give `outcome` (null: it does not swing); cricketOutcome of it is `outcome`. */
export function cricketAutoSwing(outcome: CricketOutcome): number | null {
  const between = (CRICKET_TIMING.cleanMs + CRICKET_TIMING.nearMs) / 2;
  switch (outcome) {
    case "six": return CRICKET_CONTACT_MS;
    case "over_wall": return CRICKET_CONTACT_MS - between;
    case "edge": return CRICKET_CONTACT_MS + between;
    case "bowled": return CRICKET_CONTACT_MS - CRICKET_TIMING.nearMs - 180;
    case "no_swing": return null;
  }
}

/** Where the meter's needle is (0 to 1): still at 0 until the ball leaves her hand, at 1 when a play without a swing ends. */
export function cricketMeter(ms: number): number {
  return Math.min(1, Math.max(0, (ms - CRICKET_RELEASE_MS) / (CRICKET_END_MS - CRICKET_RELEASE_MS)));
}

/** The meter's zones (0 to 1, as cricketMeter reads time): the clean hit's, and the near ones on each side of it. */
export function cricketMeterZones(): { near: [number, number]; clean: [number, number] } {
  const at = (ms: number) => cricketMeter(ms);
  return {
    near: [at(CRICKET_CONTACT_MS - CRICKET_TIMING.nearMs), at(CRICKET_CONTACT_MS + CRICKET_TIMING.nearMs)],
    clean: [at(CRICKET_CONTACT_MS - CRICKET_TIMING.cleanMs), at(CRICKET_CONTACT_MS + CRICKET_TIMING.cleanMs)],
  };
}
