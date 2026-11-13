import { cueTapPlay } from "../engines/cue_tap/EnginePlay";
import { clothFlapSkin } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the flap's play (the cue_tap engine with its skin) and its rules.
export const Play = cueTapPlay(clothFlapSkin);
export { clothFlapRules as rules } from "./rules";
