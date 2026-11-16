import { createElement, type ComponentType } from "react";
import type { MiniGamePlayProps } from "../contract";
import { rhythmTapFairness } from "../engines/rhythm_tap/engine";
import { rhythmTapPlay, type RhythmTapSkin } from "../engines/rhythm_tap/EnginePlay";
import { BARAAT_NUMBERS, baraatGame, baraatRules, baraatRulesOf, baraatWarmup, type BaraatNumbers, type BaraatOutcome, type BaraatParams } from "./rules";
import { baraatSkin, baraatSkinFor, baraatWarmupSkin } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the baraat dance's play (the rhythm_tap engine with its skin) and its
// rules; its numbers (E1), and the same with Debug's room's edited numbers (retune; never in a story) and what in them
// the engine finds unfair (fairness: the room says so). Practice's params (`warmup yes`) play the warm-up instead, a short
// dance of its own (rules.ts BARAAT_WARMUP_PHRASES), the same in Debug's room (the room tunes the dance, not the warm-up).

/** Practice's warm-up. */
const WarmupPlay = rhythmTapPlay(baraatWarmupSkin);

/** The play the host mounts: the warm-up with practice's params, else the dance of `skin`. */
function baraatPlay(skin: RhythmTapSkin<BaraatParams, BaraatOutcome>): ComponentType<MiniGamePlayProps<BaraatParams, BaraatOutcome>> {
  const Dance = rhythmTapPlay(skin);
  return function BaraatPlay(props: MiniGamePlayProps<BaraatParams, BaraatOutcome>) {
    return createElement(baraatWarmup(props.params) ? WarmupPlay : Dance, props);
  };
}

export const Play = baraatPlay(baraatSkin);
export { baraatRules as rules };
export const tuning = BARAAT_NUMBERS;
export function retune(edited: BaraatNumbers) {
  const game = baraatGame(edited);
  return { Play: baraatPlay(baraatSkinFor(game)), rules: baraatRulesOf(game) };
}
export function fairness(edited: BaraatNumbers): string[] {
  return rhythmTapFairness(baraatGame(edited).tuning);
}
