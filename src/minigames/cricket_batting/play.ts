import { cueTapPlay } from "../engines/cue_tap/EnginePlay";
import { CRICKET_TUNING, cricketFairness, cricketRules, type CricketTuning } from "./rules";
import { cricketSkin, cricketSkinFor } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the cricket's play (the cue_tap engine with its skin) and its rules;
// its tuning (E1), and the same with Debug's room's edited numbers (retune; never in a story), and what in them would be
// unfair (each ball's script, the engine's checks).
export const Play = cueTapPlay(cricketSkin);
export { cricketRules as rules };
export const tuning = CRICKET_TUNING;
export function retune(edited: CricketTuning) {
  const skin = cricketSkinFor(edited);
  return { Play: cueTapPlay(skin), rules: skin.rules };
}
export function fairness(edited: CricketTuning): readonly string[] {
  return cricketFairness(edited);
}
