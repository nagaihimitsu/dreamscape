import { createContext, useContext } from "react";
import type { MiniGameEndOptions, MiniGameJuice, MiniGameReaction } from "../contract";
import { NO_JUICE } from "./juice";

// What the host gives every part of a play, also deep in a skin's field (docs/13 2.6): the juice toolkit, the heroine's
// quick reaction, whether it is practice, and the play's end. The play's props carry the same; a skin whose engine does
// not hand them to its field reads them here (useMiniGameKit), so no engine needs changing for a skin to use them. The
// first end of a play counts: a skin that knows its finish moment and record better than its engine (the bricks falling)
// may end there; the engine's own end later does nothing.

export interface MiniGameKit {
  juice: MiniGameJuice;
  react(kind: MiniGameReaction, lineJa?: string): void;
  practice: boolean;
  still: boolean;
  /** The play's end (MiniGamePlayProps.end): the first call of a play counts. */
  end(outcome: string, detailJa?: string, options?: MiniGameEndOptions): void;
}

/** Outside a play (a field rendered on its own in a test): everything does nothing. */
const NO_KIT: MiniGameKit = { juice: NO_JUICE, react() {}, practice: false, still: false, end() {} };

export const MiniGameKitContext = createContext<MiniGameKit>(NO_KIT);

/** The play's kit: juice, react, practice, still. */
export function useMiniGameKit(): MiniGameKit {
  return useContext(MiniGameKitContext);
}
