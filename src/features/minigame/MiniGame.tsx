import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MINI_GAMES } from "../../minigames/registry";
import { miniGameChoice, type MiniGameTag } from "../../minigames/tag";
import type { MiniGameModule } from "../../minigames/contract";
import { createPlayClock, type HostClock } from "../../minigames/host/clock";
import { playSe, playSound } from "../../audio/sound-effects";
import { vibrate } from "../../audio/vibration";
import "./minigame.css";

/** How long the result's label stays before the story goes on. */
const RESULT_MS = 1300;

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
  const [module, setModule] = useState<MiniGameModule | null>(null);
  const definition = MINI_GAMES[tag.id];
  const still = reduceMotion || (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    let live = true;
    void definition.load().then((loaded) => { if (live) setModule(loaded); });
    return () => { live = false; };
  }, [definition]);
  function finish(outcome: string) {
    const choice = miniGameChoice(choices, tag, outcome);
    if (!choice || !onChoose(choice.index)) setPlaying(false);
  }
  return (
    <div className="choices minigame-ready" data-testid="minigame">
      <p className="choice-hint">{auto ? "おまかせで遊びます。" : definition.hintJa}</p>
      <button type="button" className="primary minigame-start" data-testid="minigame-start" disabled={!ready || playing || !module}
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
      {playing && host && module && createPortal(
        <Layer module={module} title={definition.titleJa} labels={Object.fromEntries(definition.outcomes.map((item) => [item.id, item.labelJa]))}
          auto={auto ? tag.auto : null} still={still} partner={partner} onDone={finish} onAbort={() => setPlaying(false)} />, host)}
    </div>
  );
}

/** The play over the scene: the game's field and controls, then its outcome's label for a moment. */
function Layer({ module, title, labels, auto, still, partner, onDone, onAbort }: {
  module: MiniGameModule; title: string; labels: Readonly<Record<string, string>>; auto: string | null; still: boolean; partner?: ReactNode;
  onDone: (outcome: string) => void; onAbort: () => void;
}) {
  const clock = useMemo<HostClock>(() => createPlayClock(), []);
  const [result, setResult] = useState<string | null>(null);
  const layer = useRef<HTMLElement>(null);
  const latest = useRef({ onDone, onAbort });
  latest.current = { onDone, onAbort };
  useEffect(() => {
    (layer.current?.querySelector<HTMLElement>("[data-minigame-primary]") ?? layer.current)?.focus({ preventScroll: true });
    // A hidden page stops the play: it starts again from its button.
    const hidden = () => { if (document.hidden) latest.current.onAbort(); };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      clock.stop();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [clock]);
  useEffect(() => {
    if (result === null) return;
    const timer = window.setTimeout(() => latest.current.onDone(result), RESULT_MS);
    return () => window.clearTimeout(timer);
  }, [result]);
  const Play = module.Play;
  return (
    <section ref={layer} tabIndex={-1} className="minigame-layer" data-testid="minigame-play" data-still={still || undefined}
      data-outcome={result ?? undefined} data-no-advance aria-label={title} onClick={(event) => event.stopPropagation()}>
      <Play params={{}} auto={auto} still={still} seed={0} clock={clock} cast={{ heroine: partner }} names={{ player: "", heroine: "" }} art={{}}
        sound={playSound} vibrate={vibrate} status={() => undefined} end={(outcome) => {
          clock.stop();
          setResult(outcome);
        }} />
      {result !== null && <p className="minigame-result">{labels[result]}</p>}
      <p className="sr-only" role="status">{result !== null ? labels[result] : ""}</p>
    </section>
  );
}
