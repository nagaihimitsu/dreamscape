import { searchFairness } from "../engines/search/engine";
import { PARASOL_TUNING, parasolFairness, parasolRulesFor, parasolSetupFor, type ParasolTuning } from "./rules";
import { parasolPlayFor } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the parasol's play (the search engine with its skin: the street's
// rounds, or the practice's own look when the params say `warmup`) and its rules (with the rating); its tuning (E1), the
// same with Debug's room's edited numbers (retune; never in a story; its practice the warm-up too), and what in them would
// be unfair (fairness: the room says so).
export const Play = parasolPlayFor(PARASOL_TUNING);
export { parasolRules as rules } from "./rules";
export const tuning = PARASOL_TUNING;
export function retune(edited: ParasolTuning) {
  return { Play: parasolPlayFor(edited), rules: parasolRulesFor(edited) };
}
export function fairness(edited: ParasolTuning): string[] {
  return [...searchFairness(parasolSetupFor(edited)({ at: "middle" })), ...parasolFairness(edited)];
}
