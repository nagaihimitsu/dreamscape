import { createElement, type ComponentType } from "react";
import type { MiniGamePlayProps } from "../contract";
import { rhythmTapPlay, type RhythmTapSkin } from "../engines/rhythm_tap/EnginePlay";
import {
  GOLGAPPA_NUMBERS, golgappaGame, golgappaRules, golgappaRulesFor, golgappaWarmup, type GolgappaNumbers, type GolgappaOutcome, type GolgappaParams,
} from "./rules";
import { golgappaSkin, golgappaSkinFor, golgappaWarmupSkin } from "./Skin";

// What the definition's load() reads (docs/13 2.3): the golgappa duel's play (the rhythm_tap engine with its skin) and its
// rules; its numbers (E1), and the same with Debug's room's edited numbers (retune; never in a story) and what in them
// would be unfair (fairness: the room says so). The host's practice (`warmup yes`) plays the practice's own skin and
// rules (rules.ts golgappaWarmup), the real play the duel's.

type GolgappaSkin = RhythmTapSkin<GolgappaParams, GolgappaOutcome>;

/** The play of the duel, or of its practice when the params say `warmup yes` (each its own engine play). */
function golgappaPlay(duel: GolgappaSkin, practice: GolgappaSkin): ComponentType<MiniGamePlayProps<GolgappaParams, GolgappaOutcome>> {
  const DuelPlay = rhythmTapPlay(duel);
  const PracticePlay = rhythmTapPlay(practice);
  return function GolgappaPlay(props: MiniGamePlayProps<GolgappaParams, GolgappaOutcome>) {
    return createElement(props.params.warmup === "yes" ? PracticePlay : DuelPlay, props);
  };
}

export const Play = golgappaPlay(golgappaSkin, golgappaWarmupSkin);
export { golgappaRules as rules };
export const tuning = GOLGAPPA_NUMBERS;
export function retune(edited: GolgappaNumbers) {
  const duel = golgappaGame(edited);
  const practice = golgappaWarmup(edited);
  return { Play: golgappaPlay(golgappaSkinFor(duel), golgappaSkinFor(practice)), rules: golgappaRulesFor(duel, practice) };
}
export function fairness(edited: GolgappaNumbers): string[] {
  return [...golgappaGame(edited).fairness(), ...golgappaWarmup(edited).fairness().map((problem) => `practice: ${problem}`)];
}
