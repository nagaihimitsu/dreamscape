import { createElement, type ComponentType } from "react";
import type { MiniGamePlayProps } from "../contract";
import { rhythmTapPlay } from "../engines/rhythm_tap/EnginePlay";
import { SAY_NUMBERS, sayGame, sayRules, sayTogetherRules, type SayGame, type SayNumbers, type SayTogetherOutcome, type SayTogetherParams } from "./rules";
import { sayTogetherSkin, sayTogetherSkinFor, sayWarmupSkin } from "./Skin";

// What the definition's load() reads (docs/13 2.3): saying it together's play (the rhythm_tap engine with its skin) and
// its rules; its numbers (E1), and the same with Debug's room's edited numbers (retune; never in a story: her count
// follows the edited breath and beat) and what in them is unfair (fairness: the room says so). Practice's params
// (`warmup: "yes"`) play the warm-up's skin and rules instead (its own fixed numbers, retuned or not: rules.ts).

type SayPlay = ComponentType<MiniGamePlayProps<SayTogetherParams, SayTogetherOutcome>>;
const WarmupPlay: SayPlay = rhythmTapPlay(sayWarmupSkin);

/** The play of a game: the warm-up's when the params ask for it (practice), else the game's own. */
function sayPlay(RealPlay: SayPlay): SayPlay {
  return function SayTogetherPlay(props) {
    return createElement(props.params?.warmup === "yes" ? WarmupPlay : RealPlay, props);
  };
}

export const Play = sayPlay(rhythmTapPlay(sayTogetherSkin));
export { sayTogetherRules as rules };
export const tuning = SAY_NUMBERS;
export function retune(edited: SayNumbers) {
  const game: SayGame = sayGame(edited);
  return { Play: sayPlay(rhythmTapPlay(sayTogetherSkinFor(game))), rules: sayRules(game) };
}
export function fairness(edited: SayNumbers): string[] {
  return sayGame(edited).fairness();
}
