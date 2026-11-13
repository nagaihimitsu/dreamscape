import type { CueTapTuning } from "../engines/cue_tap/engine";
import { cueTapPlay } from "../engines/cue_tap/EnginePlay";
import { SAY_TUNING, sayTogetherRules } from "./rules";
import { sayTogetherSkin, sayTogetherSkinFor } from "./Skin";

// What the definition's load() reads (docs/13 2.3): saying it together's play (the cue_tap engine with its skin) and its
// rules; its tuning (E1), and the same with Debug's room's edited numbers (retune; never in a story: her count follows
// the edited lead and beat).
export const Play = cueTapPlay(sayTogetherSkin);
export { sayTogetherRules as rules };
export const tuning = SAY_TUNING;
export function retune(edited: CueTapTuning) {
  const skin = sayTogetherSkinFor(edited);
  return { Play: cueTapPlay(skin), rules: skin.rules };
}
