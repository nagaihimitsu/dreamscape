import { createElement, type ComponentType } from "react";
import type { MiniGamePlayProps } from "../contract";
import { shapeDragFairness } from "../engines/shape_drag/engine";
import { shapeDragPlay } from "../engines/shape_drag/EnginePlay";
import { isRotiWarmup, ROTI_NUMBERS, rotiGame, rotiRules, type RotiNumbers, type RotiOutcome, type RotiParams } from "./rules";
import { rotiSkin, rotiSkinFor } from "./Skin";
import { rotiWarmupSkin } from "./Warmup";

// What the definition's load() reads (docs/13 2.3): the roti's play (the shape_drag engine with its skin) and its rules;
// its numbers (E1), and the same with Debug's room's edited numbers (retune; never in a story) and what in them the
// engine finds unfair (fairness: the room says so). Practice (params `warmup`) plays its own short roti in either.

type RotiPlayProps = MiniGamePlayProps<RotiParams, RotiOutcome>;
const WarmupPlay = shapeDragPlay(rotiWarmupSkin);
/** The play for its params: practice's short roti (Warmup.tsx) when they say `warmup`, else `Real`. */
function withWarmup(Real: ComponentType<RotiPlayProps>): ComponentType<RotiPlayProps> {
  return function RotiPlay(props: RotiPlayProps) {
    return createElement(isRotiWarmup(props.params) ? WarmupPlay : Real, props);
  };
}

export const Play = withWarmup(shapeDragPlay(rotiSkin));
export { rotiRules as rules };
export const tuning = ROTI_NUMBERS;
export function retune(edited: RotiNumbers) {
  const skin = rotiSkinFor(rotiGame(edited));
  return { Play: withWarmup(shapeDragPlay(skin)), rules: skin.rules };
}
export function fairness(edited: RotiNumbers): string[] {
  const game = rotiGame(edited);
  return shapeDragFairness(game.tuning, game.shapes);
}
