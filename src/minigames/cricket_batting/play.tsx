import type { MiniGamePlayProps, MiniGameRules } from "../contract";
import { CricketBatting } from "../../features/minigame/CricketBatting";
import { cricketAutoSwing, cricketOutcome, type CricketOutcome } from "../../domain/cricket-batting";

// The cricket's play and rules, the module its definition's `load()` reads (docs/13 2.3). For now the screen's own play
// behind the module's props; the shared host and the cue_tap engine take its parts over (docs/13 8 R2–R4).

export function Play({ auto, still, cast, end }: MiniGamePlayProps<object, CricketOutcome>) {
  return <CricketBatting auto={auto !== null} autoOutcome={auto ?? "six"} still={still} partner={cast.heroine}
    onDone={(outcome) => end(outcome as CricketOutcome)} onAbort={() => undefined} />;
}

export const rules: MiniGameRules<object, CricketOutcome, number | null> = {
  outcomeOf: (swingMs) => cricketOutcome(swingMs),
  autoRecord: (outcome) => cricketAutoSwing(outcome),
};
