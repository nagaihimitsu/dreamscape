import type { CueTapTuning } from "../engines/cue_tap/engine";
import { cueTapPlay } from "../engines/cue_tap/EnginePlay";
import { MONKEY_TUNING, monkeyCatchRules } from "./rules";
import { monkeyCatchSkin, monkeyCatchSkinFor } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the catch's play (the cue_tap engine with its skin) and its rules; its
// tuning (E1), and the same with Debug's room's edited numbers (retune; never in a story).
export const Play = cueTapPlay(monkeyCatchSkin);
export { monkeyCatchRules as rules };
export const tuning = MONKEY_TUNING;
export function retune(edited: CueTapTuning) {
  const skin = monkeyCatchSkinFor(edited);
  return { Play: cueTapPlay(skin), rules: skin.rules };
}
