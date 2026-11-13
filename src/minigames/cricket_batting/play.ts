import { cueTapPlay } from "../engines/cue_tap/EnginePlay";
import { cricketSkin } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the cricket's play (the cue_tap engine with its skin) and its rules.
export const Play = cueTapPlay(cricketSkin);
export { cricketRules as rules } from "./rules";
