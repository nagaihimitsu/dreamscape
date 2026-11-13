import { searchPlay } from "../engines/search/EnginePlay";
import { parasolSkin } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the parasol's play (the search engine with its skin) and its rules.
export const Play = searchPlay(parasolSkin);
export { parasolRules as rules } from "./rules";
