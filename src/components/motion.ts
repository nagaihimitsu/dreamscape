/**
 * The lengths of motion (2026-11-28 user decision: six patterns at most), the same as styles.css's --motion-* (the
 * design-token test holds them to it; docs/14 「デザインの決まり」). A timer in the code that waits for a motion on the
 * screen, or plays one itself (Web Animations), takes its length from here. A presentation longer than 1.4 s (a title
 * card, the packing, a ride, time passing) is that thing's own length, and a game's timing (a mini-game's window, a
 * double tap's) is not a motion.
 */
export const MOTION: Readonly<Record<"instant" | "fast" | "short" | "scene" | "slow" | "long", number>> = {
  instant: 120,
  fast: 200,
  short: 300,
  scene: 450,
  slow: 700,
  long: 1400,
};

/** Between the items of a list coming in, one after another (--motion-stagger): an interval, not a length. */
export const MOTION_STAGGER = 40;
