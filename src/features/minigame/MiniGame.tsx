import { useState, type ComponentType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MINI_GAMES } from "../../minigames/registry";
import { miniGameChoice, type MiniGameTag } from "../../minigames/tag";
import { playSe } from "../../audio/sound-effects";
import { CricketBatting, type MiniGamePlayProps } from "./CricketBatting";
import "./minigame.css";

/** Each game's play (src/minigames/registry.ts lists the games and their outcomes). */
const PLAYS: Record<string, ComponentType<MiniGamePlayProps>> = {
  cricket_batting: CricketBatting,
};

/**
 * A line's `# minigame:` (2026-11-13): where the choices would be, the game's start button (and, with Debug mode on, a
 * button per outcome); its play over the whole scene (`host`); at its end, the choice of its outcome is taken as if
 * pressed (`onChoose`, the scene's own choice). Nothing is saved before that: a reload starts the game again.
 */
export function MiniGame({ tag, choices, ready, auto, debug, reduceMotion, host, partner, onChoose }: {
  tag: MiniGameTag;
  choices: readonly { index: number; optionId?: string }[];
  /** The line is shown and its choice guard is over: the start button may be pressed. */
  ready: boolean;
  /** 「ミニゲームをおまかせにする」 (⚙設定). */
  auto: boolean;
  /** Debug mode: the outcome may be picked directly. */
  debug: boolean;
  /** 「演出を短縮する」 (the device's reduced motion is read here too). */
  reduceMotion: boolean;
  /** The scene the play lies over. */
  host: HTMLElement | null;
  partner?: ReactNode;
  /** Take the choice at `index`; false when it could not be taken now. */
  onChoose: (index: number) => boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const definition = MINI_GAMES[tag.id];
  const Play = PLAYS[tag.id];
  const still = reduceMotion || (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  function finish(outcome: string) {
    const choice = miniGameChoice(choices, tag, outcome);
    if (!choice || !onChoose(choice.index)) setPlaying(false);
  }
  return (
    <div className="choices minigame-ready" data-testid="minigame">
      <p className="choice-hint">{auto ? "おまかせで遊びます。" : definition.hintJa}</p>
      <button type="button" className="primary minigame-start" data-testid="minigame-start" disabled={!ready || playing}
        onClick={() => {
          playSe("ui_confirm");
          setPlaying(true);
        }}>
        {definition.startJa} <span aria-hidden="true">→</span>
      </button>
      {debug && (
        <div className="minigame-debug" role="group" aria-label="結果を選ぶ（Debug）">
          <p className="fine-print">Debug：結果を選ぶ</p>
          {definition.outcomes.map((outcome) => (
            <button key={outcome.id} type="button" className="secondary" data-testid={`minigame-debug-${outcome.id}`} disabled={!ready || playing}
              onClick={() => finish(outcome.id)}>{outcome.labelJa}（{outcome.id}）</button>
          ))}
        </div>
      )}
      {playing && host && createPortal(
        <Play auto={auto} autoOutcome={tag.auto} still={still} partner={partner} onDone={finish} onAbort={() => setPlaying(false)} />, host)}
    </div>
  );
}
