import { cueTapPlay } from "../engines/cue_tap/EnginePlay";
import { monkeyCatchSkin } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the catch's play (the cue_tap engine with its skin) and its rules.
export const Play = cueTapPlay(monkeyCatchSkin);
export { monkeyCatchRules as rules } from "./rules";
