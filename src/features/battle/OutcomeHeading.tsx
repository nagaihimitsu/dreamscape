import type { BattleOutcome } from "../../domain/battle";

/** The result's words: English on screen, Japanese for screen readers (UI stage 0, item C). */
const OUTCOME_HEADINGS: Record<BattleOutcome, { en: string; ja: string }> = {
  // A quiz with a person met on the way, not a fight: no victory or defeat (user decision 2026-11-11).
  perfect: { en: "PERFECT", ja: "全問正解" },
  victory: { en: "CLEAR", ja: "クリア" },
  defeat: { en: "NICE TRY", ja: "ナイストライ" },
};

/**
 * The quiz result's heading. The English is decoration (aria-hidden, lang="en"), so the heading's
 * accessible name is the Japanese word in the visually hidden span.
 */
export function OutcomeHeading({ outcome }: { outcome: BattleOutcome }) {
  return (
    <h2 className="outcome">
      <span lang="en" aria-hidden="true">{OUTCOME_HEADINGS[outcome].en}</span>
      <span className="sr-only">{OUTCOME_HEADINGS[outcome].ja}</span>
    </h2>
  );
}
