import { searchPlay } from "../engines/search/EnginePlay";
import { mehndiSkin } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the hidden name's play (the search engine with its skin) and its rules.
export const Play = searchPlay(mehndiSkin);
export { mehndiRules as rules } from "./rules";
