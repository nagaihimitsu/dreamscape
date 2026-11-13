import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentType } from "react";
import type { MiniGamePlayProps, MiniGameRules } from "../../contract";
import { searchActionEnding, searchAutoActionAt, searchEnding, type SearchAction, type SearchEnding, type SearchGame, type SearchRecord, type SearchSetup } from "./engine";
import "./engine.css";

// The search engine's play (docs/13 2.2): the skin's field of spots (it draws them as buttons and says which one the
// player searched), the skin's extra buttons at the bottom in thumb reach, the time limit and the idle limit on the
// host's clock. The skin's rules decide; the host shows the outcome and takes its choice.

/** What the field shows: what the player has done so far, and the ending once there is one. */
export interface SearchView {
  /** The spots searched, in order. */
  searched: readonly number[];
  /** Each button's presses so far. */
  presses: Readonly<Record<string, number>>;
  /** The latest action and when it was done (the host's clock), for a field that shows it for a moment (an echo, a creak). */
  last: { action: SearchAction; at: number } | null;
  /** How the play ended, once it has (the field shows it until the host takes the outcome). */
  ending: SearchEnding | null;
}

/** What a skin's field is given: the play's props it draws with, the setup, the view, and how to search. */
export type SearchFieldProps<Params, Outcome extends string> =
  Pick<MiniGamePlayProps<Params, Outcome>, "params" | "still" | "seed" | "cast" | "names" | "art" | "sound" | "vibrate"> & {
    setup: SearchSetup;
    view: SearchView;
    /** The player's input is taken (not while 「おまかせ」 plays, nor once the play has ended). */
    live: boolean;
    /** Searches a spot (nothing when the input is not taken, or the spot was searched already). */
    search(spot: number): void;
    /** The player is looking (a drag, a scroll): the idle limit starts again. */
    active(): void;
    /** Subscribes `draw` to every frame of the play (its time on the host's clock); returns the unsubscribe. */
    frames(draw: (ms: number) => void): () => void;
  };

/** One of the skin's extra buttons (the setup's button of the same ID says how many presses end the play). */
export interface SearchButton {
  id: string;
  labelJa: string;
  /** What it does, read out with it. */
  hintJa: string;
  tone: "primary" | "secondary";
}

/** A skin of search: its game (setup, outcomes, 「おまかせ」), its rules (searchRules of the game), its words and its field. */
export interface SearchSkin<Params, Outcome extends string> {
  game: SearchGame<Params, Outcome>;
  rules: MiniGameRules<Params, Outcome, SearchRecord>;
  /** How to play, above the buttons (not while おまかせ plays). */
  hintJa: string;
  buttons: readonly SearchButton[];
  /** In place of the buttons while おまかせ plays. */
  autoJa: string;
  /** How long the field shows the ending before the play ends. */
  endDelayMs(ending: SearchEnding, still: boolean): number;
  /** The top band's short text at a frame (leftMs: of the time limit; null without one). */
  statusJa?(view: SearchView, leftMs: number | null): string;
  Field: ComponentType<SearchFieldProps<Params, Outcome>>;
}

/** When 「おまかせ」's lapse comes: the time limit, or the idle limit after its last action (a short wait without either). */
function lapseAt(record: SearchRecord, setup: SearchSetup): number {
  const after = record.actions.length ? searchAutoActionAt(record.actions.length - 1) : 0;
  if (record.lapse === "timeout" && setup.timeLimitMs !== null) return setup.timeLimitMs;
  return after + (setup.idleMs ?? setup.timeLimitMs ?? 3000);
}

/** The play of a search skin. */
export function searchPlay<Params, Outcome extends string>(skin: SearchSkin<Params, Outcome>): ComponentType<MiniGamePlayProps<Params, Outcome>> {
  return function SearchPlay(props: MiniGamePlayProps<Params, Outcome>) {
    const { params, auto, clock, still, seed, cast, names, art, sound, vibrate } = props;
    const setup = useMemo(() => skin.game.setup(params), [params]);
    const autoRecord = useMemo(() => (auto === null ? null : skin.rules.autoRecord(auto, params)), [auto, params]);
    const [view, setView] = useState<SearchView>({ searched: [], presses: {}, last: null, ending: null });
    const actions = useRef<SearchAction[]>([]);
    const decided = useRef<{ outcome: Outcome; endAt: number } | null>(null);
    const lastActive = useRef(0);
    const draws = useRef(new Set<(ms: number) => void>());
    const latest = useRef(props);
    latest.current = props;
    const latestView = useRef(view);
    latestView.current = view;
    const hintId = useId();

    const finish = useCallback((record: SearchRecord, ms: number) => {
      if (decided.current) return;
      const ending = searchEnding(record, setup);
      const outcome = skin.rules.outcomeOf(record, latest.current.params);
      decided.current = { outcome, endAt: ms + skin.endDelayMs(ending, latest.current.still) };
      setView((current) => ({ ...current, ending }));
    }, [setup]);
    const act = useCallback((action: SearchAction, ms: number) => {
      if (decided.current) return;
      lastActive.current = ms;
      // A spot searched already, or no such spot or button: only a look.
      if ("spot" in action ? actions.current.some((item) => "spot" in item && item.spot === action.spot) || action.spot < 0 || action.spot >= setup.spots
        : !setup.buttons.some((button) => button.id === action.button)) return;
      actions.current = [...actions.current, action];
      setView((current) => ({
        searched: "spot" in action ? [...current.searched, action.spot] : current.searched,
        presses: "button" in action ? { ...current.presses, [action.button]: (current.presses[action.button] ?? 0) + 1 } : current.presses,
        last: { action, at: ms },
        ending: current.ending,
      }));
      if (searchActionEnding(actions.current, setup)) finish({ actions: actions.current, lapse: null }, ms);
    }, [setup, finish]);

    useEffect(() => {
      let ended = false;
      let autoIndex = 0;
      let shown: string | null = null;
      return clock.onFrame((ms) => {
        if (!decided.current) {
          if (autoRecord) {
            if (autoIndex < autoRecord.actions.length) {
              if (ms >= searchAutoActionAt(autoIndex)) act(autoRecord.actions[autoIndex++], ms);
            } else if (autoRecord.lapse && ms >= lapseAt(autoRecord, setup)) finish(autoRecord, ms);
          } else if (setup.timeLimitMs !== null && ms >= setup.timeLimitMs) finish({ actions: actions.current, lapse: "timeout" }, ms);
          else if (setup.idleMs !== null && ms - lastActive.current >= setup.idleMs) finish({ actions: actions.current, lapse: "idle" }, ms);
        }
        if (skin.statusJa) {
          const text = skin.statusJa(latestView.current, setup.timeLimitMs === null ? null : Math.max(0, setup.timeLimitMs - ms));
          if (text !== shown) {
            shown = text;
            latest.current.status(text);
          }
        }
        for (const draw of draws.current) draw(ms);
        const done = decided.current;
        if (done && !ended && ms >= done.endAt) {
          ended = true;
          latest.current.end(done.outcome);
        }
      });
    }, [clock, autoRecord, setup, act, finish]);
    const live = auto === null && view.ending === null;
    const search = useCallback((spot: number) => {
      if (latest.current.auto === null) act({ spot }, clock.now());
    }, [act, clock]);
    const active = useCallback(() => {
      if (latest.current.auto === null && !decided.current) lastActive.current = clock.now();
    }, [clock]);
    const frames = useCallback((draw: (ms: number) => void) => {
      draws.current.add(draw);
      return () => { draws.current.delete(draw); };
    }, []);
    const Field = skin.Field;
    return (
      <div className="mg-engine-search">
        <div className="mg-search-field">
          <Field params={params} still={still} seed={seed} cast={cast} names={names} art={art} sound={sound} vibrate={vibrate}
            setup={setup} view={view} live={live} search={search} active={active} frames={frames} />
        </div>
        <div className="mg-search-controls">
          {auto === null && <p className="mg-search-hint" id={hintId}>{skin.hintJa}</p>}
          {auto !== null ? <p className="mg-search-auto">{skin.autoJa}</p> : (
            <div className="mg-search-buttons">
              {skin.buttons.map((button) => (
                <button key={button.id} type="button" className={`${button.tone} mg-search-button`} data-testid={`minigame-button-${button.id}`}
                  aria-disabled={!live || undefined} aria-describedby={`${hintId}-${button.id}`}
                  onClick={() => { if (live) act({ button: button.id }, clock.now()); }}>
                  {button.labelJa}
                </button>
              ))}
              {skin.buttons.map((button) => <span key={button.id} id={`${hintId}-${button.id}`} className="sr-only">{button.hintJa}</span>)}
            </div>
          )}
        </div>
      </div>
    );
  };
}
