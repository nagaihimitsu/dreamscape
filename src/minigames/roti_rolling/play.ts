import { shapeDragPlay } from "../engines/shape_drag/EnginePlay";
import { ROTI_NUMBERS, rotiGame, rotiRules, type RotiNumbers } from "./rules";
import { rotiSkin, rotiSkinFor } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the roti's play (the shape_drag engine with its skin) and its rules;
// its numbers (E1), and the same with Debug's room's edited numbers (retune; never in a story).
export const Play = shapeDragPlay(rotiSkin);
export { rotiRules as rules };
export const tuning = ROTI_NUMBERS;
export function retune(edited: RotiNumbers) {
  const skin = rotiSkinFor(rotiGame(edited));
  return { Play: shapeDragPlay(skin), rules: skin.rules };
}
