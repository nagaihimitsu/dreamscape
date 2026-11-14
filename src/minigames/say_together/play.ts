import { rhythmTapPlay } from "../engines/rhythm_tap/EnginePlay";
import { SAY_NUMBERS, sayGame, sayTogetherRules, type SayNumbers } from "./rules";
import { sayTogetherSkin, sayTogetherSkinFor } from "./Skin";

// What the definition's load() reads (docs/13 2.3): saying it together's play (the rhythm_tap engine with its skin) and
// its rules; its numbers (E1), and the same with Debug's room's edited numbers (retune; never in a story: her count
// follows the edited breath and beat) and what in them is unfair (fairness: the room says so).
export const Play = rhythmTapPlay(sayTogetherSkin);
export { sayTogetherRules as rules };
export const tuning = SAY_NUMBERS;
export function retune(edited: SayNumbers) {
  const skin = sayTogetherSkinFor(sayGame(edited));
  return { Play: rhythmTapPlay(skin), rules: skin.rules };
}
export function fairness(edited: SayNumbers): string[] {
  return sayGame(edited).fairness();
}
