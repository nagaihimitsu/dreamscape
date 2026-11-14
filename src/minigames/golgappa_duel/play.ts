import { rhythmTapPlay } from "../engines/rhythm_tap/EnginePlay";
import { GOLGAPPA_NUMBERS, golgappaGame, golgappaRules, type GolgappaNumbers } from "./rules";
import { golgappaSkin, golgappaSkinFor } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the golgappa duel's play (the rhythm_tap engine with its skin) and its
// rules; its numbers (E1), and the same with Debug's room's edited numbers (retune; never in a story) and what in them
// would be unfair (fairness: the room says so).
export const Play = rhythmTapPlay(golgappaSkin);
export { golgappaRules as rules };
export const tuning = GOLGAPPA_NUMBERS;
export function retune(edited: GolgappaNumbers) {
  const skin = golgappaSkinFor(golgappaGame(edited));
  return { Play: rhythmTapPlay(skin), rules: skin.rules };
}
export function fairness(edited: GolgappaNumbers): string[] {
  return golgappaGame(edited).fairness();
}
