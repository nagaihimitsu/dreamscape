import { cueTapPlay } from "../engines/cue_tap/EnginePlay";
import { sayTogetherSkin } from "./Skin";

// What the definition's load() reads (docs/13 2.3): saying it together's play (the cue_tap engine with its skin) and its rules.
export const Play = cueTapPlay(sayTogetherSkin);
export { sayTogetherRules as rules } from "./rules";
