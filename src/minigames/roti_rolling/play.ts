import { shapeDragPlay } from "../engines/shape_drag/EnginePlay";
import { rotiSkin } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the roti's play (the shape_drag engine with its skin) and its rules.
export const Play = shapeDragPlay(rotiSkin);
export { rotiRules as rules } from "./rules";
