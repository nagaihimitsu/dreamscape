import { rhythmTapFairness } from "../engines/rhythm_tap/engine";
import { rhythmTapPlay } from "../engines/rhythm_tap/EnginePlay";
import { BARAAT_NUMBERS, baraatGame, baraatRules, type BaraatNumbers } from "./rules";
import { baraatSkin, baraatSkinFor } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the baraat dance's play (the rhythm_tap engine with its skin) and its
// rules; its numbers (E1), and the same with Debug's room's edited numbers (retune; never in a story) and what in them
// the engine finds unfair (fairness: the room says so).
export const Play = rhythmTapPlay(baraatSkin);
export { baraatRules as rules };
export const tuning = BARAAT_NUMBERS;
export function retune(edited: BaraatNumbers) {
  const skin = baraatSkinFor(baraatGame(edited));
  return { Play: rhythmTapPlay(skin), rules: skin.rules };
}
export function fairness(edited: BaraatNumbers): string[] {
  return rhythmTapFairness(baraatGame(edited).tuning);
}
