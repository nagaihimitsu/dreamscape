import type { MiniGameJuice } from "../contract";

/**
 * The juice toolkit that does nothing (outside a play, or before the host gives the real one). Kept apart from
 * juice.ts, which draws on the page: a skin reaches this module through kit.ts, and a skin is loaded by the story
 * validator through its definition, so it must not pull page code in (story-validation-cache.test.ts).
 */
export const NO_JUICE: MiniGameJuice = { hitStop() {}, shake() {}, flash() {}, burst() {}, squash() {}, denied() {} };
