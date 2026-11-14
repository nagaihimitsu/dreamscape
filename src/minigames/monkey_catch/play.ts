import { cueTapPlay } from "../engines/cue_tap/EnginePlay";
import { MONKEY_TUNING, monkeyCatchFairness, monkeyCatchRules, type MonkeyTuning } from "./rules";
import { monkeyCatchSkin, monkeyCatchSkinFor } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the catch's play (the cue_tap engine with its skin) and its rules; its
// tuning (E1), and the same with Debug's room's edited numbers (retune; never in a story), and what in them would be
// unfair (the monkey's script, the engine's checks).
export const Play = cueTapPlay(monkeyCatchSkin);
export { monkeyCatchRules as rules };
export const tuning = MONKEY_TUNING;
export function retune(edited: MonkeyTuning) {
  const skin = monkeyCatchSkinFor(edited);
  return { Play: cueTapPlay(skin), rules: skin.rules };
}
export function fairness(edited: MonkeyTuning): readonly string[] {
  return monkeyCatchFairness(edited);
}
