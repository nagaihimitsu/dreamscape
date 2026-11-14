import { searchPlay } from "../engines/search/EnginePlay";
import { MEHNDI_TUNING, mehndiFairness, type MehndiTuning } from "./rules";
import { mehndiSkin, mehndiSkinFor } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the hidden name's play (the search engine with its skin) and its
// rules; its tuning (E1), the same with Debug's room's edited numbers (retune; never in a story), and what in them would
// mislead (fairness: the room says so).
export const Play = searchPlay(mehndiSkin);
export { mehndiRules as rules } from "./rules";
export const tuning = MEHNDI_TUNING;
export function retune(edited: MehndiTuning) {
  const skin = mehndiSkinFor(edited);
  return { Play: searchPlay(skin), rules: skin.rules };
}
export const fairness = mehndiFairness;
