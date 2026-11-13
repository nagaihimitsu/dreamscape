import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { playSe, playSound } from "../../audio/sound-effects";
import { vibrate } from "../../audio/vibration";
import { CharacterFace, CharacterFigure } from "../../components/CharacterPortrait";
import type { MiniGameCast, MiniGameEndOptions, MiniGameModule, MiniGameRating, MiniGameReaction } from "../contract";
import { availableOutcome } from "../fallback";
import { miniGameDefinition } from "../registry";
import { miniGameArtPath, miniGameParams, type MiniGameTag } from "../tag";
import type { MiniGameStageCast } from "./ChoicePoint";
import { browserClockDriver, createPlayClock, type HostClock } from "./clock";
import { countPhase, fillNames, FINISH, finishLevel, finishWord, pickLine, REACTION_EMOTION, resultButtons, resultCardDelay, type CountPhase, type FinishLevel } from "./flow";
import { HandDemo } from "./HandDemo";
import { createJuice, NO_JUICE } from "./juice";
import { MiniGameKitContext, type MiniGameKit } from "./kit";
import { miniGameTrack } from "./music";
import { ResultCard, resultCardReady } from "./ResultCard";
import { miniGameSeed } from "./seed";
import {
  MINI_GAME_CHOICE_GUARD_MS, MINI_GAME_COUNT_MS, MINI_GAME_FINISH_MS, MINI_GAME_REACT_GAP_MS, MINI_GAME_REACT_MS, MINI_GAME_RESULT_MS,
  MINI_GAME_START_GUARD_MS, MINI_GAME_STAR_STEP_MS,
} from "./timing";
import type { MiniGameEnvironment } from "./MiniGameProvider";
import "./host.css";

// The shared host of every mini-game (docs/13 2.6). The flow, the same for every game:
//   instruction card → (練習) → 3・2・1・スタート → play → そこまで！ → result card → the story.
// The card sits where the choices would be (its title, goal, hand and length; one line after the game's first play in
// the session); the play lies over the scene with its top band (the game's name, its status, 「中断する」), the clock and
// its pause, 「おまかせ」 and its tap to skip, the heroine's quick reactions and the juice toolkit; the finish stops it and
// says its word; the result card shows ★ (rated plays), the label, the score and her line, then takes the outcome's choice.
// A game draws only its field and its controls, and declares a few fields (contract.ts).

type Load = { status: "loading" } | { status: "loaded"; module: MiniGameModule } | { status: "failed" };
/** The count a play starts with: the host's 3・2・1・スタート, 「スタート！」 alone (a quick retry), or none. */
type Count = "full" | "go" | "none";
type Run = { id: number; clock: HostClock; practice: boolean; count: Count; startedAt: number };
type Ended = {
  outcome: string; detail?: string; rating: MiniGameRating | null; word: string | null; level: FinishLevel; cardAt: number | null;
  /** How far above the layer's bottom the card sits: over the play's main control, so a finger still tapping it hits nothing. */
  cardBottom?: number;
};
type Reaction = { key: number; kind: MiniGameReaction; lineJa?: string };

const prefersLessMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const isPressKey = (event: KeyboardEvent) => event.key === " " || event.key === "Enter";

/** The games played in this session (the page's life, never saved): their instruction card is one line from then on. */
const playedThisSession = new Set<string>();

export function MiniGameHost({ tag, ready, cast, environment, slot }: {
  tag: MiniGameTag;
  ready: boolean;
  cast: MiniGameStageCast;
  environment: MiniGameEnvironment;
  /** The screen's MiniGameSlot, where the play lies over the scene. */
  slot: HTMLElement | null;
}) {
  const definition = miniGameDefinition(tag.id);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [armed, setArmed] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [ended, setEnded] = useState<Ended | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [count, setCount] = useState<CountPhase>(null);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState("");
  const [refused, setRefused] = useState(false);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [emotion, setEmotion] = useState<string | undefined>();
  const [brief] = useState(() => playedThisSession.has(tag.id));
  const chosen = useRef(false);
  const focusStart = useRef(false);
  const startButton = useRef<HTMLButtonElement>(null);
  const layer = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const fx = useRef<HTMLDivElement>(null);
  const runRef = useRef<Run | null>(null);
  runRef.current = run;
  const endedRef = useRef(false);
  const lastReactAt = useRef(Number.NEGATIVE_INFINITY);
  const timers = useRef<number[]>([]);
  const latest = useRef(environment);
  latest.current = environment;
  const still = environment.reduceMotion || prefersLessMotion();
  const names = environment.names;
  // The outcomes whose choices can be taken now; one that cannot takes its declared fallback (docs/13 4.2), おまかせ's too.
  const allOutcomes = useMemo(() => definition?.outcomes.map((outcome) => outcome.id) ?? [], [definition]);
  const availableKey = (environment.available ?? allOutcomes).join(" ");
  const available = useMemo(() => (availableKey ? availableKey.split(" ") : []), [availableKey]);
  const taken = useCallback((outcome: string) => (definition && availableOutcome(definition, outcome, available)) ?? outcome, [definition, available]);
  const auto = environment.auto ? taken(tag.auto) : null;
  const practiceOffer = auto === null && definition?.practice ? definition.practice : null;
  // The tag's keys as the game reads them (a saved tag was read with the same reader; a failure shows like a failed load);
  // practice reads its own keys over them.
  const read = useCallback((params: MiniGameTag["params"]) => {
    try {
      return { ok: true as const, value: miniGameParams({ ...tag, ...(params ? { params } : {}) }, environment.context) };
    } catch {
      return { ok: false as const };
    }
  }, [tag, environment.context]);
  const params = useMemo(() => read(tag.params), [read, tag.params]);
  const practiceParams = useMemo(() => (practiceOffer ? read({ ...tag.params, ...practiceOffer.params }) : params), [read, practiceOffer, tag.params, params]);
  const art = useMemo(() => Object.fromEntries(Object.entries(tag.art ?? {}).flatMap(([slotId, imageId]) => {
    const path = miniGameArtPath(environment.context, imageId);
    return path ? [[slotId, `${import.meta.env.BASE_URL}${path}`]] : [];
  })), [tag, environment.context]);
  const seed = useMemo(() => miniGameSeed(environment.revision, tag.id, tag.prefix), [environment.revision, tag]);
  // The module played: the game's own, or Debug's room's retune of it with the edited numbers.
  const played = useMemo(() => {
    if (load.status !== "loaded") return null;
    const { module } = load;
    return environment.tuning && module.retune ? { ...module, ...module.retune({ ...module.tuning, ...environment.tuning }) } : module;
  }, [load, environment.tuning]);
  const track = miniGameTrack(definition?.music);

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
  const later = useCallback((ms: number, callback: () => void) => { timers.current.push(window.setTimeout(callback, ms)); }, []);
  const clearTimers = () => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  };
  useEffect(() => () => { for (const timer of timers.current) window.clearTimeout(timer); }, []);

  /** Back to a fresh state for a new play, or for the card. */
  const reset = () => {
    clearTimers();
    endedRef.current = false;
    setEnded(null);
    setFinishing(false);
    setCount(null);
    setPaused(false);
    setStatus("");
    setReaction(null);
    setEmotion(undefined);
    lastReactAt.current = Number.NEGATIVE_INFINITY;
  };
  const choose = useCallback((outcome: string) => {
    if (chosen.current) return;
    chosen.current = true;
    if (latest.current.onOutcome(outcome)) return;
    // Refused (content:build makes every outcome choosable; this is a safety net): back to the start, nothing chosen.
    chosen.current = false;
    setRun((current) => { current?.clock.stop(); return null; });
    reset();
    setRefused(true);
    focusStart.current = true;
  }, []);
  /** Starts a play: the real one or practice; `quick` (the card's 「もう一回」) skips the count but 「スタート！」. */
  const start = (practice: boolean, quick = false) => {
    const ok = practice ? practiceParams.ok : params.ok;
    if (!armed || !played || !ok || (run && !endedRef.current)) return;
    playSe("ui_confirm");
    playedThisSession.add(tag.id);
    run?.clock.stop();
    reset();
    setRefused(false);
    const counted = definition?.countdown === "host" && auto === null;
    const countKind: Count = counted ? (quick ? "go" : "full") : "none";
    const leadMs = countKind === "full" ? MINI_GAME_COUNT_MS : 0;
    const clock = createPlayClock(browserClockDriver, { leadMs, ...(environment.inputDelayMs ? { inputDelayMs: environment.inputDelayMs } : {}) });
    setRun((current) => ({ id: (current?.id ?? 0) + 1, clock, practice, count: countKind, startedAt: performance.now() + leadMs }));
  };
  const quit = useCallback(() => {
    setRun((current) => { current?.clock.stop(); return null; });
    reset();
    focusStart.current = true;
  }, []);
  const sound = useCallback((id: string) => {
    if (definition?.sounds.includes(id)) playSound(id);
    else if (import.meta.env.DEV) console.warn(`The mini-game ${tag.id} rings ${id}, which its definition's sounds do not list`);
  }, [definition, tag.id]);
  const juice = useMemo(() => (run ? createJuice({ stage: () => stage.current, fx: () => fx.current, still, clock: run.clock, seed, sound: playSound }) : NO_JUICE),
    [run, still, seed]);
  const juiceRef = useRef(juice);
  juiceRef.current = juice;
  const react = useCallback((kind: MiniGameReaction, lineJa?: string) => {
    const now = performance.now();
    if (now - lastReactAt.current < MINI_GAME_REACT_GAP_MS) return;
    lastReactAt.current = now;
    setEmotion(REACTION_EMOTION[kind]);
    setReaction({ key: now, kind, ...(lineJa ? { lineJa: fillNames(lineJa, latest.current.names) } : {}) });
  }, []);
  useEffect(() => {
    if (!reaction) return;
    const timer = window.setTimeout(() => setReaction(null), MINI_GAME_REACT_MS);
    return () => window.clearTimeout(timer);
  }, [reaction]);

  /** The play is over (docs/13 2.6): the finish (a stop, a flash, its word and sound), then the result card. */
  const end = useCallback((outcome: string, detail?: string, options?: MiniGameEndOptions) => {
    const current = runRef.current;
    if (!definition || !current || endedRef.current) return;
    if (!definition.outcomes.some((item) => item.id === outcome)) {
      if (import.meta.env.DEV) console.error(`The mini-game ${tag.id} ended with ${outcome}, which is none of its outcomes`);
      return;
    }
    endedRef.current = true;
    const outcomeTaken = taken(outcome);
    let rating: MiniGameRating | null = null;
    if (options && "record" in options && played?.rules.rate) {
      try {
        rating = played.rules.rate(options.record, current.practice ? practiceParams.ok && practiceParams.value : params.ok && params.value) ?? null;
      } catch (error) {
        if (import.meta.env.DEV) console.error(`The mini-game ${tag.id} could not rate its play`, error);
      }
    }
    const level = finishLevel(rating);
    const word = finishWord(definition.outcomes.find((item) => item.id === outcomeTaken)?.finishJa);
    const finish = FINISH[level];
    juiceRef.current.hitStop(finish.stopMs);
    if (word) {
      juiceRef.current.flash(finish.flashes > 1 ? "big" : "hit");
      playSound(finish.sound);
      vibrate(level === "plain" ? "fail" : "success");
    }
    setEnded({ outcome: outcomeTaken, ...(detail ? { detail } : {}), rating, word, level, cardAt: null });
    setFinishing(!!word);
    later(MINI_GAME_FINISH_MS, () => setFinishing(false));
    later(resultCardDelay(options?.holdMs), () => {
      runRef.current?.clock.stop();
      // The card sits just above the play's main control (the thumb's button): taps that go on there reach the dead play.
      const primary = stage.current?.querySelector("[data-minigame-primary]")?.getBoundingClientRect();
      const box = layer.current?.getBoundingClientRect();
      const cardBottom = primary && box && primary.height > 0 ? Math.round(box.bottom - primary.top + 8) : undefined;
      setEnded((state) => (state ? { ...state, cardAt: performance.now(), ...(cardBottom !== undefined ? { cardBottom } : {}) } : state));
    });
  }, [definition, tag.id, taken, played, params, practiceParams, later]);

  const cardShown = ended?.cardAt !== null && ended?.cardAt !== undefined;
  const buttons = resultButtons({ practice: !!run?.practice, retry: !!(environment.retry || tag.retry) });
  // The card: ★ one by one with their sound (★3: the perfect chime and applause), then 「次へ」 by itself when it is all.
  useEffect(() => {
    if (!ended || ended.cardAt === null) return;
    const stars = ended.rating?.stars ?? 0;
    const timersHere: number[] = [];
    if (stars) {
      if (still) playSound(stars === 3 ? "quiz_perfect" : "ui_tap");
      else for (let index = 0; index < stars; index++)
        timersHere.push(window.setTimeout(() => playSound(index === 2 ? "quiz_perfect" : "ui_tap"), index * MINI_GAME_STAR_STEP_MS));
      if (stars === 3) timersHere.push(window.setTimeout(() => playSound("applause"), still ? 0 : 3 * MINI_GAME_STAR_STEP_MS));
    }
    if (buttons.autoAdvance) timersHere.push(window.setTimeout(() => choose(ended.outcome), MINI_GAME_RESULT_MS));
    return () => { for (const timer of timersHere) window.clearTimeout(timer); };
    // The card's moment: its own effects once.
  }, [ended?.cardAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // The host's count: 3・2・1 through the clock's lead, 「スタート！」 as the play's time starts (frozen with the page).
  useEffect(() => {
    if (!run || run.count === "none") return;
    let last: CountPhase | undefined;
    const update = () => {
      const phase = countPhase(run.clock.leadLeft(), run.clock.now());
      if (phase === last) return;
      last = phase;
      setCount(phase);
      if (phase === "go") playSe("ui_confirm");
      else if (phase) playSe("ui_tap");
      if (phase === null) off();
    };
    const off = run.clock.onFrame(update);
    update();
    return off;
  }, [run]);
  // A game with its own music: its track from スタート to the result card (the scene's again after it).
  useEffect(() => {
    if (!run || !track || cardShown) return;
    let on = false;
    const off = run.clock.after(0, () => {
      on = true;
      latest.current.onMusic?.(track);
    });
    return () => {
      off();
      if (on) latest.current.onMusic?.(null);
    };
  }, [run, track, cardShown]);

  // Focus: into the play as it starts (its main control), the card's main button as it comes, back to the start button
  // when the play is left.
  useEffect(() => {
    if (run) (layer.current?.querySelector<HTMLElement>("[data-minigame-primary]") ?? layer.current)?.focus({ preventScroll: true });
  }, [run?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (run || !focusStart.current) return;
    focusStart.current = false;
    startButton.current?.focus({ preventScroll: true });
  });
  // A hidden page stops the clock (the count too); a timed game waits for 「続ける」 when it comes back, another goes on.
  useEffect(() => {
    if (!run || ended) return;
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
  }, [run, ended, definition, quit]);
  useEffect(() => () => { run?.clock.stop(); }, [run]);
  // A quiet game lowers the scene's music and ambience while it plays.
  const quiet = !!definition?.quietScene && !!run;
  useEffect(() => {
    if (!quiet) return;
    latest.current.onQuiet?.(true);
    return () => latest.current.onQuiet?.(false);
  }, [quiet]);

  const kit = useMemo<MiniGameKit>(() => ({ juice, react, practice: !!run?.practice, still, end }), [juice, react, run?.practice, still, end]);
  // Her figure on the field follows her reactions (the line's own face before any: docs/13, group2 H4).
  const heroineEmotion = emotion ?? cast.heroine.emotion;
  const { sceneId, cityId } = cast.heroine;
  const heroine = useMemo(() => <CharacterFigure characterId="heroine" emotion={heroineEmotion} sceneId={sceneId} cityId={cityId} />,
    [heroineEmotion, sceneId, cityId]);
  const playCast = useMemo<MiniGameCast>(() => ({ heroine, ...(cast.person ? { person: cast.person } : {}) }), [heroine, cast.person]);
  const face = (kind: MiniGameReaction) => <CharacterFace characterId="heroine" emotion={REACTION_EMOTION[kind]} sceneId={sceneId} cityId={cityId} />;

  if (!definition) return null;
  const outcomeOf = (outcome: string) => definition.outcomes.find((item) => item.id === outcome);
  const label = (outcome: string) => fillNames(outcomeOf(outcome)?.labelJa ?? "", names);
  /**
   * Input the play must not take: before its time starts (the count), just after a start without the count (the start
   * button's second tap), while paused, and once it has ended.
   */
  const blocked = () => {
    const current = runRef.current;
    if (!current || endedRef.current || current.clock.paused || current.clock.leadLeft() > 0) return true;
    return current.count !== "full" && performance.now() - current.startedAt < MINI_GAME_START_GUARD_MS;
  };
  const dropBlocked = (event: SyntheticEvent) => {
    // Esc always leaves (中断する), the count included.
    if (!blocked() || (event as KeyboardEvent).key === "Escape") return;
    event.stopPropagation();
    if (event.cancelable) event.preventDefault();
  };
  const isQuit = (event: SyntheticEvent) => (event.target as Element | null)?.closest?.("[data-minigame-quit], .minigame-result");
  const onLayerPointer = (event: PointerEvent) => {
    // 「おまかせ」: a tap anywhere skips to its outcome (2026-11-13: less waiting).
    if (event.button !== 0 || isQuit(event) || endedRef.current || paused || auto === null) return;
    if (runRef.current && performance.now() - runRef.current.startedAt < MINI_GAME_START_GUARD_MS) return;
    end(auto);
  };
  const onLayerKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!endedRef.current || run?.practice) quit();
      return;
    }
    if (!isPressKey(event) || isQuit(event) || event.repeat) return;
    if (cardShown && ended && resultCardReady(ended.cardAt!)) {
      event.preventDefault();
      if (buttons.next) choose(ended.outcome);
      else start(false);
    } else if (auto !== null && !endedRef.current && !paused) {
      event.preventDefault();
      end(auto);
    }
  };
  const resume = () => {
    run?.clock.resume();
    setPaused(false);
    (layer.current?.querySelector<HTMLElement>("[data-minigame-primary]") ?? layer.current)?.focus({ preventScroll: true });
  };
  const Play = played?.Play ?? null;
  const playParams = run?.practice ? practiceParams : params;
  const failed = load.status === "failed" || !params.ok;
  const outcome = ended ? outcomeOf(ended.outcome) : undefined;
  const line = ended && outcome?.reaction ? pickLine(outcome.reaction.linesJa, seed) : undefined;
  const filledLine = line ? fillNames(line, names) : undefined;
  const score = ended?.rating?.scoreJa ?? ended?.detail;
  const announced = cardShown && ended ? [
    run?.practice ? "練習" : "", label(ended.outcome), score ?? "", ended.rating ? `★3つのうち${ended.rating.stars}つ` : "",
    ended.rating?.scoreJa && ended.detail ? ended.detail : "", filledLine ? `「${filledLine}」` : "",
  ].filter(Boolean).join("。") : "";
  const goal = auto !== null ? "おまかせで遊びます。" : definition.goalJa ?? definition.hintJa;
  const showQuit = !ended || !!run?.practice;

  return (
    <div className="choices minigame-ready" data-testid="minigame" data-game={tag.id}>
      <div className="minigame-card" data-brief={brief || undefined} data-testid="minigame-card">
        {definition.controls && auto === null && <HandDemo kind={definition.controls} still={still} />}
        <div className="minigame-card-text">
          {!brief && <p className="minigame-card-title">{definition.titleJa}
            {definition.durationSec ? <span className="minigame-card-length">約{definition.durationSec}秒</span> : null}</p>}
          <p className="choice-hint minigame-card-goal">{goal}</p>
        </div>
      </div>
      {failed ? (
        <div className="minigame-failed" role="alert">
          <p>ミニゲームを読み込めませんでした。</p>
          <div className="minigame-failed-actions">
            {load.status === "failed" && <button type="button" className="secondary" data-testid="minigame-retry" onClick={() => setAttempt((value) => value + 1)}>もう一度</button>}
            <button type="button" className="primary" data-testid="minigame-fallback" disabled={!armed} onClick={() => choose(taken(tag.auto))}>おまかせで進める</button>
          </div>
        </div>
      ) : (
        <div className="minigame-card-actions" data-practice={practiceOffer ? true : undefined}>
          {practiceOffer && <button type="button" className="secondary minigame-practice" data-testid="minigame-practice"
            disabled={!armed || load.status !== "loaded" || !!run} onClick={() => start(true)}>練習する</button>}
          <button ref={startButton} type="button" className="primary minigame-start" data-testid="minigame-start"
            disabled={!armed || load.status !== "loaded" || !!run} onClick={() => start(false)}>
            {load.status === "loading" ? "準備中…" : definition.startJa} <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
      {auto === null && (definition.keysJa === null
        ? <p className="fine-print minigame-keys">キーボードでは遊べません。⚙設定の「ミニゲームをおまかせにする」で進められます。</p>
        : <p className="fine-print minigame-keys">{definition.keysJa}</p>)}
      {refused && <p className="fine-print" role="alert">今はこの結果を選べません。</p>}
      {environment.debug && (
        <div className="minigame-debug" role="group" aria-label="結果を選ぶ（Debug）">
          <p className="fine-print">Debug：結果を選ぶ</p>
          {definition.outcomes.map((item) => (
            <button key={item.id} type="button" className="secondary" data-testid={`minigame-debug-${item.id}`} disabled={!armed || !!run}
              onClick={() => choose(taken(item.id))}>
              {item.labelJa}（{item.id}{taken(item.id) !== item.id ? ` → 今は ${taken(item.id)}` : ""}）</button>
          ))}
        </div>
      )}
      {run && Play && playParams.ok && slot && createPortal(
        <section ref={layer} tabIndex={-1} role="region" aria-label={definition.titleJa} className="minigame-layer" data-testid="minigame-play"
          data-game={tag.id} data-still={still || undefined} data-outcome={ended?.outcome} data-paused={paused || undefined} data-no-advance
          data-practice={run.practice || undefined} data-counting={count && count !== "go" ? true : undefined}
          onPointerDown={onLayerPointer} onKeyDown={onLayerKey} onClick={(event) => event.stopPropagation()}>
          {tag.bg && environment.backdrop && <div className="minigame-backdrop mg-photo" aria-hidden="true">{environment.backdrop(tag.bg)}</div>}
          <header className="minigame-band">
            <span className="minigame-band-title">{definition.titleJa}</span>
            {run.practice && <span className="minigame-band-practice" data-testid="minigame-practice-label">練習</span>}
            <span className="minigame-band-status" data-testid="minigame-status">{status}</span>
            {showQuit && <button type="button" className="minigame-quit" data-testid="minigame-quit" data-minigame-quit onClick={quit}>中断する</button>}
          </header>
          <div ref={stage} className="minigame-stage" onPointerDownCapture={dropBlocked} onPointerUpCapture={dropBlocked} onClickCapture={dropBlocked}
            onKeyDownCapture={dropBlocked}>
            <MiniGameKitContext.Provider value={kit}>
              <Play key={run.id} params={playParams.value} auto={auto} available={available} still={still} seed={seed} clock={run.clock} cast={playCast}
                names={names} art={art} sound={sound} vibrate={vibrate} status={setStatus} end={end} practice={run.practice} juice={juice} react={react} />
            </MiniGameKitContext.Provider>
            <div ref={fx} className="minigame-fx" aria-hidden="true" />
          </div>
          {reaction && (
            <div key={reaction.key} className="minigame-react" data-testid="minigame-react" aria-hidden="true">
              {face(reaction.kind)}{reaction.lineJa && <p className="minigame-react-line">{reaction.lineJa}</p>}
            </div>
          )}
          {count && <p key={count} className="minigame-count" data-phase={count} data-testid="minigame-count" aria-hidden="true">{count === "go" ? "スタート！" : count}</p>}
          {finishing && ended?.word && <p className="minigame-finish" data-level={ended.level} data-testid="minigame-finish" aria-hidden="true">{ended.word}</p>}
          {cardShown && ended && (
            <ResultCard label={label(ended.outcome)} rating={ended.rating} {...(score ? { score } : {})}
              {...(ended.rating?.scoreJa && ended.detail ? { detail: ended.detail } : {})}
              {...(outcome?.reaction ? { face: face(outcome.reaction.kind) } : {})} {...(filledLine ? { line: filledLine } : {})}
              practice={run.practice} retry={!!(environment.retry || tag.retry)} anchor={definition.resultAnchor ?? "bottom"} {...(ended.cardBottom !== undefined ? { bottom: ended.cardBottom } : {})} still={still} shownAt={ended.cardAt!}
              onNext={() => choose(ended.outcome)} onRetry={() => start(run.practice, true)} onToReal={() => start(false)} />
          )}
          {paused && !ended && (
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
