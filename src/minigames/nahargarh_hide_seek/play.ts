import { searchPlay } from "../engines/search/EnginePlay";
import { HIDE_SEEK_TUNING, type HideSeekTuning } from "./rules";
import { hideSeekSkin, hideSeekSkinFor } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the hide-and-seek's play (the search engine with its skin) and its
// rules; its tuning (E1), and the same with Debug's room's edited numbers (retune; never in a story).
export const Play = searchPlay(hideSeekSkin);
export { hideSeekRules as rules } from "./rules";
export const tuning = HIDE_SEEK_TUNING;
export function retune(edited: HideSeekTuning) {
  const skin = hideSeekSkinFor(edited);
  return { Play: searchPlay(skin), rules: skin.rules };
}
