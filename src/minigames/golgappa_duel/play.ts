import { rhythmTapPlay } from "../engines/rhythm_tap/EnginePlay";
import { golgappaSkin } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the golgappa duel's play (the rhythm_tap engine with its skin) and its rules.
export const Play = rhythmTapPlay(golgappaSkin);
export { golgappaRules as rules } from "./rules";
