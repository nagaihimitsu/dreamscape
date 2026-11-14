import { cueTapPlay } from "../engines/cue_tap/EnginePlay";
import { CLOTH_TUNING, clothFlapFairness, clothFlapRules, type ClothTuning } from "./rules";
import { clothFlapSkin, clothFlapSkinFor } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the flap's play (the cue_tap engine with its skin) and its rules; its
// tuning (E1), and the same with Debug's room's edited numbers (retune; never in a story: her walk follows the edited
// numbers), and what in them would be unfair (her walk's script, the engine's checks).
export const Play = cueTapPlay(clothFlapSkin);
export { clothFlapRules as rules };
export const tuning = CLOTH_TUNING;
export function retune(edited: ClothTuning) {
  const skin = clothFlapSkinFor(edited);
  return { Play: cueTapPlay(skin), rules: skin.rules };
}
export function fairness(edited: ClothTuning): readonly string[] {
  return clothFlapFairness(edited);
}
