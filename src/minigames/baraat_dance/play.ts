import { rhythmTapPlay } from "../engines/rhythm_tap/EnginePlay";
import { baraatSkin } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the baraat dance's play (the rhythm_tap engine with its skin) and its rules.
export const Play = rhythmTapPlay(baraatSkin);
export { baraatRules as rules } from "./rules";
