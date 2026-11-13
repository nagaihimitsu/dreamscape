import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { TagContext } from "../../content/tags";

// What every mini-game gets from the game, given once by GameApp (docs/13 1.5): a screen's own wiring is only ChoicePoint,
// MiniGameSlot and the cast it passes. The Debug room gives its own (no game, no save).

export interface MiniGameEnvironment {
  /** ⚙設定「ミニゲームをおまかせにする」: every play plays itself to its tag's `auto`. */
  auto: boolean;
  /** Debug mode: a button per outcome under the start button. */
  debug: boolean;
  /** 「演出を短縮する」 (the device's own setting is read too). */
  reduceMotion: boolean;
  /** The names as the player wrote them. */
  names: { player: string; heroine: string };
  /** The save's revision: a new frame starts a new play; the play's looks (its seed) come from it. */
  revision: number;
  /** The lists a tag's keys are read with (the game's own keys; its art). */
  context: TagContext;
  /**
   * The outcomes whose choices can be taken now (undefined: every one). A play, 「おまかせ」 and Debug's buttons that end on
   * another take its declared fallback (fallback.ts, docs/13 4.2).
   */
  available?: readonly string[];
  /** Takes the outcome's choice (as the screen's choice button would); false when it cannot be taken now. */
  onOutcome(outcome: string): boolean;
  /** The picture behind a play whose tag names `bg` (the scene's background drawer). */
  backdrop?(backgroundId: string): ReactNode;
  /** A `quietScene` game plays: the scene's music and ambience go down (true) or back (false). */
  onQuiet?(quiet: boolean): void;
}

type Context = { environment: MiniGameEnvironment; slot: HTMLElement | null; setSlot(element: HTMLElement | null): void };
const MiniGameContext = createContext<Context | null>(null);

export function MiniGameProvider({ value, children }: { value: MiniGameEnvironment; children?: ReactNode }) {
  // The screen on show puts its slot here (one screen at a time; MiniGameSlot).
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const context = useMemo(() => ({ environment: value, slot, setSlot }), [value, slot]);
  return <MiniGameContext.Provider value={context}>{children}</MiniGameContext.Provider>;
}

/** The game's environment and the slot the play lies in; null outside a provider (a screen then shows its choices as they are). */
export function useMiniGameContext(): Context | null {
  return useContext(MiniGameContext);
}

/**
 * Where a play lies over the scene (docs/13 1.5): each story screen puts one at its scene's root. No box of its own; while
 * a play is in it, the scene shows only its picture and weather under the play (host.css).
 */
export function MiniGameSlot() {
  const context = useMiniGameContext();
  return <div className="minigame-slot" ref={context?.setSlot} />;
}
