import type { CueTapTuning } from "../engines/cue_tap/engine";
import { cueTapPlay } from "../engines/cue_tap/EnginePlay";
import { CLOTH_TUNING, clothFlapRules } from "./rules";
import { clothFlapSkin, clothFlapSkinFor } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the flap's play (the cue_tap engine with its skin) and its rules; its
// tuning (E1), and the same with Debug's room's edited numbers (retune; never in a story: her walk follows the edited
// windows and pace).
export const Play = cueTapPlay(clothFlapSkin);
export { clothFlapRules as rules };
export const tuning = CLOTH_TUNING;
export function retune(edited: CueTapTuning) {
  const skin = clothFlapSkinFor(edited);
  return { Play: cueTapPlay(skin), rules: skin.rules };
}
