import { searchPlay } from "../engines/search/EnginePlay";
import { hideSeekSkin } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the hide-and-seek's play (the search engine with its skin) and its rules.
export const Play = searchPlay(hideSeekSkin);
export { hideSeekRules as rules } from "./rules";
