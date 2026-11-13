import { stepPickPlay } from "../engines/step_pick/EnginePlay";
import { rajuHaggleSkin } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the haggle's play (the step_pick engine with its skin) and its rules.
export const Play = stepPickPlay(rajuHaggleSkin);
export { rajuHaggleRules as rules } from "./rules";
