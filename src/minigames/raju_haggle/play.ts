import { stepPickPlay } from "../engines/step_pick/EnginePlay";
import { RAJU_HAGGLE_TUNING, type RajuTuning } from "./rules";
import { rajuHaggleSkin, rajuHaggleSkinFor } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the haggle's play (the step_pick engine with its skin) and its rules;
// its tuning (E1), and the same with Debug's room's edited numbers (retune; never in a story).
export const Play = stepPickPlay(rajuHaggleSkin);
export { rajuHaggleRules as rules } from "./rules";
export const tuning = RAJU_HAGGLE_TUNING;
export function retune(edited: RajuTuning) {
  const skin = rajuHaggleSkinFor(edited);
  return { Play: stepPickPlay(skin), rules: skin.rules };
}
