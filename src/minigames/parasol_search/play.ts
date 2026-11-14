import { searchFairness } from "../engines/search/engine";
import { searchPlay } from "../engines/search/EnginePlay";
import { PARASOL_TUNING, parasolFairness, parasolSetupFor, type ParasolTuning } from "./rules";
import { parasolSkin, parasolSkinFor } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the parasol's play (the search engine with its skin) and its rules
// (with the rating); its tuning (E1), the same with Debug's room's edited numbers (retune; never in a story), and what in
// them would be unfair (fairness: the room says so).
export const Play = searchPlay(parasolSkin);
export { parasolRules as rules } from "./rules";
export const tuning = PARASOL_TUNING;
export function retune(edited: ParasolTuning) {
  const skin = parasolSkinFor(edited);
  return { Play: searchPlay(skin), rules: skin.rules };
}
export function fairness(edited: ParasolTuning): string[] {
  return [...searchFairness(parasolSetupFor(edited)({ at: "middle" })), ...parasolFairness(edited)];
}
