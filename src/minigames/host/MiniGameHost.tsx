import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { playSe, playSound } from "../../audio/sound-effects";
import { vibrate } from "../../audio/vibration";
import type { MiniGameCast, MiniGameModule } from "../contract";
import { miniGameDefinition } from "../registry";
import { miniGameParams, type MiniGameTag } from "../tag";
import { createPlayClock, type HostClock } from "./clock";
import { miniGameSeed } from "./seed";
import { MINI_GAME_CHOICE_GUARD_MS, MINI_GAME_RESULT_MS, MINI_GAME_START_GUARD_MS } from "./timing";
import type { MiniGameEnvironment } from "./MiniGameProvider";
import "./host.css";

// The shared host of every mini-game (docs/13 2.6): the start where the choices would be, the loading, the play's layer
// over the scene with its top band (the game's name, its status, 「中断する」), the clock and its pause, 「おまかせ」 and its
// tap to skip, the outcome's label and its announcement, then the outcome's choice. A game draws only its field and its
// controls.


type Load = { status: "loading" } | { status: "loaded"; module: MiniGameModule } | { status: "failed" };
type Run = { id: number; clock: HostClock; startedAt: number };

const prefersLessMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const isPressKey = (event: KeyboardEvent) => event.key === " " || event.key === "Enter";

export function MiniGameHost({ tag, ready, cast, environment, slot }: {
  tag: MiniGameTag;
  ready: boolean;
  cast: MiniGameCast;
  environment: MiniGameEnvironment;
  /** The screen's MiniGameSlot, where the play lies over the scene. */
  slot: HTMLElement | null;
}) {
  const definition = miniGameDefinition(tag.id);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [armed, setArmed] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [result, setResult] = useState<{ outcome: string; detail?: string } | null>(null);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState("");
  const [refused, setRefused] = useState(false);
  const chosen = useRef(false);
  const focusStart = useRef(false);
  const startButton = useRef<HTMLButtonElement>(null);
  const layer = useRef<HTMLElement>(null);
  const latest = useRef(environment);
  latest.current = environment;
  const still = environment.reduceMotion || prefersLessMotion();
  const auto = environment.auto ? tag.auto : null;
  // The tag's keys as the game reads them (a saved tag was read with the same reader; a failure shows like a failed load).
  const params = useMemo(() => {
    try {
      return { ok: true as const, value: miniGameParams(tag, environment.context) };
    } catch {
      return { ok: false as const };
    }
  }, [tag, environment.context]);
  const art = useMemo(() => Object.fromEntries(Object.entries(tag.art ?? {}).flatMap(([slotId, imageId]) => {
    const path = environment.context.miniGameArt?.[imageId];
    return path ? [[slotId, `${import.meta.env.BASE_URL}${path}`]] : [];
  })), [tag, environment.context]);
  const seed = useMemo(() => miniGameSeed(environment.revision, tag.id, tag.prefix), [environment.revision, tag]);

  // The play's file (and the use's pictures) load as the frame shows, so the start rarely waits.
  useEffect(() => {
    if (!definition) return;
    let live = true;
    setLoad({ status: "loading" });
    definition.load().then((module) => { if (live) setLoad({ status: "loaded", module }); }, () => { if (live) setLoad({ status: "failed" }); });
    for (const url of Object.values(art)) new Image().src = url;
    return () => { live = false; };
  }, [definition, attempt, art]);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setArmed(true), MINI_GAME_CHOICE_GUARD_MS);
    return () => window.clearTimeout(timer);
  }, [ready]);

  const choose = useCallback((outcome: string) => {
    if (chosen.current) return;
    chosen.current = true;
    if (latest.current.onOutcome(outcome)) return;
    // Refused (content:build makes every outcome choosable; this is a safety net): back to the start, nothing chosen.
    chosen.current = false;
    setRun((current) => { current?.clock.stop(); return null; });
    setResult(null);
    setPaused(false);
    setRefused(true);
    focusStart.current = true;
  }, []);
  const start = () => {
    if (!armed || load.status !== "loaded" || run || !params.ok) return;
    playSe("ui_confirm");
    setRefused(false);
    setStatus("");
    setPaused(false);
    setResult(null);
    setRun((current) => ({ id: (current?.id ?? 0) + 1, clock: createPlayClock(), startedAt: performance.now() }));
  };
  const quit = useCallback(() => {
    setRun((current) => { current?.clock.stop(); return null; });
    setResult(null);
    setPaused(false);
    setStatus("");
    focusStart.current = true;
  }, []);
  const end = useCallback((outcome: string, detail?: string) => {
    if (!definition?.outcomes.some((item) => item.id === outcome)) {
      if (import.meta.env.DEV) console.error(`The mini-game ${tag.id} ended with ${outcome}, which is none of its outcomes`);
      return;
    }
    setRun((current) => { current?.clock.stop(); return current; });
    setResult((current) => current ?? { outcome, ...(detail ? { detail } : {}) });
  }, [definition, tag.id]);
  const sound = useCallback((id: string) => {
    if (definition?.sounds.includes(id)) playSound(id);
    else if (import.meta.env.DEV) console.warn(`The mini-game ${tag.id} rings ${id}, which its definition's sounds do not list`);
  }, [definition, tag.id]);

  // Focus: into the play as it starts (its main control), back to the start button when it is left.
  useEffect(() => {
    if (run) (layer.current?.querySelector<HTMLElement>("[data-minigame-primary]") ?? layer.current)?.focus({ preventScroll: true });
  }, [run?.id]);
  useEffect(() => {
    if (run || !focusStart.current) return;
    focusStart.current = false;
    startButton.current?.focus({ preventScroll: true });
  });
  // A hidden page stops the clock; a timed game waits for 「続ける」 when it comes back, another goes on.
  useEffect(() => {
    if (!run || result) return;
    const onVisibility = () => {
      if (document.hidden) {
        run.clock.pause();
        if (definition?.timed) setPaused(true);
      } else if (!definition?.timed) run.clock.resume();
    };
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") quit(); };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("keydown", onKey);
    };
  }, [run, result, definition, quit]);
  useEffect(() => () => { run?.clock.stop(); }, [run]);
  // The outcome's label for a moment, then its choice.
  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => choose(result.outcome), MINI_GAME_RESULT_MS);
    return () => window.clearTimeout(timer);
  }, [result, choose]);
  // A quiet game lowers the scene's music and ambience while it plays.
  const quiet = !!definition?.quietScene && !!run;
  useEffect(() => {
    if (!quiet) return;
    latest.current.onQuiet?.(true);
    return () => latest.current.onQuiet?.(false);
  }, [quiet]);

  if (!definition) return null;
  const label = (outcome: string) => definition.outcomes.find((item) => item.id === outcome)?.labelJa ?? "";
  const guarded = () => !!run && performance.now() - run.startedAt < MINI_GAME_START_GUARD_MS;
  /** The start button's second tap (and a key held from it) reaches nothing in the play. */
  const dropEarly = (event: SyntheticEvent) => {
    if (!guarded()) return;
    event.stopPropagation();
    event.preventDefault();
  };
  const isQuit = (event: SyntheticEvent) => (event.target as Element | null)?.closest?.("[data-minigame-quit]");
  const onLayerPointer = (event: PointerEvent) => {
    if (event.button !== 0 || isQuit(event)) return;
    if (result) choose(result.outcome);
    // 「おまかせ」: a tap anywhere skips to its outcome (2026-11-13: less waiting).
    else if (auto !== null && !paused) end(auto);
  };
  const onLayerKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!result) quit();
      return;
    }
    if (!isPressKey(event) || isQuit(event) || event.repeat) return;
    if (result) {
      event.preventDefault();
      choose(result.outcome);
    } else if (auto !== null && !paused) {
      event.preventDefault();
      end(auto);
    }
  };
  const resume = () => {
    run?.clock.resume();
    setPaused(false);
    (layer.current?.querySelector<HTMLElement>("[data-minigame-primary]") ?? layer.current)?.focus({ preventScroll: true });
  };
  const Play = load.status === "loaded" ? load.module.Play : null;
  const failed = load.status === "failed" || !params.ok;
  const announced = result ? `${label(result.outcome)}${result.detail ? `。${result.detail}` : ""}` : "";

  return (
    <div className="choices minigame-ready" data-testid="minigame" data-game={tag.id}>
      <p className="choice-hint">{auto !== null ? "おまかせで遊びます。" : definition.hintJa}</p>
      {failed ? (
        <div className="minigame-failed" role="alert">
          <p>ミニゲームを読み込めませんでした。</p>
          <div className="minigame-failed-actions">
            {load.status === "failed" && <button type="button" className="secondary" data-testid="minigame-retry" onClick={() => setAttempt((count) => count + 1)}>もう一度</button>}
            <button type="button" className="primary" data-testid="minigame-fallback" disabled={!armed} onClick={() => choose(tag.auto)}>おまかせで進める</button>
          </div>
        </div>
      ) : (
        <button ref={startButton} type="button" className="primary minigame-start" data-testid="minigame-start"
          disabled={!armed || load.status !== "loaded" || !!run} onClick={start}>
          {load.status === "loading" ? "準備中…" : definition.startJa} <span aria-hidden="true">→</span>
        </button>
      )}
      {auto === null && (definition.keysJa === null
        ? <p className="fine-print minigame-keys">キーボードでは遊べません。⚙設定の「ミニゲームをおまかせにする」で進められます。</p>
        : <p className="fine-print minigame-keys">{definition.keysJa}</p>)}
      {refused && <p className="fine-print" role="alert">今はこの結果を選べません。</p>}
      {environment.debug && (
        <div className="minigame-debug" role="group" aria-label="結果を選ぶ（Debug）">
          <p className="fine-print">Debug：結果を選ぶ</p>
          {definition.outcomes.map((outcome) => (
            <button key={outcome.id} type="button" className="secondary" data-testid={`minigame-debug-${outcome.id}`} disabled={!armed || !!run}
              onClick={() => choose(outcome.id)}>{outcome.labelJa}（{outcome.id}）</button>
          ))}
        </div>
      )}
      {run && Play && params.ok && slot && createPortal(
        <section ref={layer} tabIndex={-1} role="region" aria-label={definition.titleJa} className="minigame-layer" data-testid="minigame-play"
          data-game={tag.id} data-still={still || undefined} data-outcome={result?.outcome} data-paused={paused || undefined} data-no-advance
          onPointerDownCapture={dropEarly} onClickCapture={dropEarly} onKeyDownCapture={dropEarly}
          onPointerDown={onLayerPointer} onKeyDown={onLayerKey} onClick={(event) => event.stopPropagation()}>
          {tag.bg && environment.backdrop && <div className="minigame-backdrop" aria-hidden="true">{environment.backdrop(tag.bg)}</div>}
          <header className="minigame-band">
            <span className="minigame-band-title">{definition.titleJa}</span>
            <span className="minigame-band-status" data-testid="minigame-status">{status}</span>
            <button type="button" className="minigame-quit" data-testid="minigame-quit" data-minigame-quit onClick={quit}>中断する</button>
          </header>
          <div className="minigame-stage">
            <Play key={run.id} params={params.value} auto={auto} still={still} seed={seed} clock={run.clock} cast={cast}
              names={environment.names} art={art} sound={sound} vibrate={vibrate} status={setStatus} end={end} />
          </div>
          {result && <p className="minigame-result" data-testid="minigame-result" aria-hidden="true">
            {label(result.outcome)}{result.detail && <small>{result.detail}</small>}</p>}
          {paused && !result && (
            <div className="minigame-pause" role="group" aria-label="一時停止中" data-testid="minigame-pause">
              <p>一時停止中</p>
              <button type="button" className="primary" data-testid="minigame-resume" onClick={resume}>続ける</button>
              <button type="button" className="secondary" data-minigame-quit onClick={quit}>中断する</button>
            </div>
          )}
          <p className="sr-only" role="status" data-testid="minigame-announce">{announced}</p>
        </section>, slot)}
    </div>
  );
}
