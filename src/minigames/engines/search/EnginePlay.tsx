import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentType } from "react";
import type { MiniGamePlayProps, MiniGameRules } from "../../contract";
import { searchAutoActionAt, searchEnding, searchIdleMs, searchProgress, type SearchAction, type SearchEnding, type SearchGame, type SearchProgress, type SearchRecord, type SearchSetup } from "./engine";
import "./engine.css";

// The search engine's play (docs/13 2.2): the skin's field of spots (it draws them as buttons and says which one the
// player searched), the skin's extra buttons at the bottom in thumb reach, the time limit and the idle limit on the
// host's clock. The skin's rules decide; the host shows the outcome and takes its choice.

/** What the field shows: where the play is (the engine's progress), the latest action, a hint, and the ending once there is one. */
export interface SearchView extends Omit<SearchProgress, "ending" | "misses" | "helped" | "acted" | "left"> {
  /** How many rounds the play has (most games: one). */
  total: number;
  /** The latest action and when it was done (the host's clock), for a field that shows it for a moment (an echo, a creak). */
  last: { action: SearchAction; at: number } | null;
  /**
   * When the latest hint was due (the host's clock): the player has acted, then done nothing for the skin's `nudgeMs`, in a
   * play that goes on (a giggle, a door's handle). null: none yet.
   */
  nudge: number | null;
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
    /** Searches a spot of the round on show (nothing when the input is not taken, or the spot was searched already). */
    search(spot: number): void;
    /** The player is looking (a drag, a scroll): the idle limit starts again. */
    active(): void;
    /** Subscribes `draw` to every frame of the play (its time on the host's clock); returns the unsubscribe. */
    frames(draw: (ms: number) => void): () => void;
  };

/** One of the skin's extra buttons (the setup's button of the same ID says how many presses end what). */
export interface SearchButton {
  id: string;
  /** Its label; by the view for one that changes as it is pressed (「最後に呼ぶ」 before the press that ends the play). */
  labelJa: string | ((view: SearchView) => string);
  /** What it does, read out with it. */
  hintJa: string;
  tone: "primary" | "secondary";
}

/** A skin of search: its game (setup, outcomes, 「おまかせ」), its rules (searchRules of the game), its words and its field. */
export interface SearchSkin<Params, Outcome extends string> {
  game: SearchGame<Params, Outcome>;
  rules: MiniGameRules<Params, Outcome, SearchRecord>;
  /** How to play, above the buttons (not while おまかせ plays); by the round on show for a game of rounds. */
  hintJa: string | ((view: SearchView) => string);
  buttons: readonly SearchButton[];
  /** In place of the buttons while おまかせ plays. */
  autoJa: string;
  /** How long the field shows the ending before the play ends. */
  endDelayMs(ending: SearchEnding, still: boolean): number;
  /** A line under the outcome's label, for an ending the label alone does not tell (display only). */
  detailJa?(ending: SearchEnding): string | undefined;
  /** The top band's short text at a frame (leftMs: of the time limit; null without one). */
  statusJa?(view: SearchView, leftMs: number | null): string;
  /** After the player's first action, doing nothing this long (in a play that goes on) brings a hint (view.nudge), again and again. */
  nudgeMs?: number;
  Field: ComponentType<SearchFieldProps<Params, Outcome>>;
}

/** When 「おまかせ」's lapse comes: the time limit, or the idle limit after its last action (a short wait without either). */
function lapseAt(record: SearchRecord, setup: SearchSetup): number {
  const after = record.actions.length ? searchAutoActionAt(record.actions.length - 1) : 0;
  if (record.lapse === "timeout" && setup.timeLimitMs !== null) return setup.timeLimitMs;
  return after + (setup.idleMs ?? setup.timeLimitMs ?? 3000);
}

const viewOf = (progress: SearchProgress, total: number, last: SearchView["last"], nudge: number | null): SearchView => ({
  total, round: progress.round, searched: progress.searched, done: progress.done, presses: progress.presses, last, nudge, ending: progress.ending,
});

/** The play of a search skin. */
export function searchPlay<Params, Outcome extends string>(skin: SearchSkin<Params, Outcome>): ComponentType<MiniGamePlayProps<Params, Outcome>> {
  return function SearchPlay(props: MiniGamePlayProps<Params, Outcome>) {
    const { params, auto, clock, still, seed, cast, names, art, sound, vibrate } = props;
    const setup = useMemo(() => skin.game.setup(params), [params]);
    const autoRecord = useMemo(() => (auto === null ? null : skin.rules.autoRecord(auto, params)), [auto, params]);
    const [view, setView] = useState<SearchView>(() => viewOf(searchProgress([], setup), setup.rounds.length, null, null));
    const actions = useRef<SearchAction[]>([]);
    const decided = useRef<{ outcome: Outcome } | null>(null);
    const lastActive = useRef(0);
    const lastNudge = useRef(0);
    const draws = useRef(new Set<(ms: number) => void>());
    const latest = useRef(props);
    latest.current = props;
    const latestView = useRef(view);
    latestView.current = view;
    const hintId = useId();

    // The end at the moment it is decided (docs/13 2.6): the host's finish runs over the field's hold (her in the open
    // door, the ring), and the record (with when it ended) goes with it for the ★.
    const finish = useCallback((record: SearchRecord, ms: number) => {
      if (decided.current) return;
      const ending = searchEnding(record, setup);
      const kept: SearchRecord = { actions: [...record.actions], lapse: record.lapse, endMs: Math.max(0, Math.round(ms)) };
      const outcome = skin.rules.outcomeOf(kept, latest.current.params);
      const holdMs = skin.endDelayMs(ending, latest.current.still);
      decided.current = { outcome };
      setView((current) => ({ ...current, ending }));
      latest.current.end(outcome, skin.detailJa?.(ending), { record: kept, holdMs });
    }, [setup]);
    const act = useCallback((action: SearchAction, ms: number) => {
      if (decided.current) return;
      lastActive.current = ms;
      const before = searchProgress(actions.current, setup);
      const after = searchProgress([...actions.current, action], setup);
      // A spot searched already, or no such spot or button: only a look (the record keeps what changed something).
      if ("spot" in action && after.searched.length === before.searched.length && after.round === before.round && !after.ending) return;
      if ("button" in action && !setup.buttons.some((button) => button.id === action.button)) return;
      actions.current = [...actions.current, action];
      setView(viewOf(after, setup.rounds.length, { action, at: ms }, latestView.current.nudge));
      if (after.ending) finish({ actions: actions.current, lapse: null }, ms);
    }, [setup, finish]);

    useEffect(() => {
      let autoIndex = 0;
      let shown: string | null = null;
      const idleNow = () => searchIdleMs(searchProgress(actions.current, setup), setup);
      return clock.onFrame((ms) => {
        if (!decided.current) {
          if (autoRecord) {
            if (autoIndex < autoRecord.actions.length) {
              if (ms >= searchAutoActionAt(autoIndex)) act(autoRecord.actions[autoIndex++], ms);
            } else if (autoRecord.lapse && ms >= lapseAt(autoRecord, setup)) finish(autoRecord, ms);
          } else if (setup.timeLimitMs !== null && ms >= setup.timeLimitMs) finish({ actions: actions.current, lapse: "timeout" }, ms);
          else if (setup.idleMs !== null && ms - lastActive.current >= (idleNow() ?? setup.idleMs)) {
            const acted = actions.current.some((action) => !("idle" in action));
            // Doing nothing: the round on show is helped through (each idle limit gone by, at its own time: a frame late
            // after a long stall helps as many rounds; a round left to her shortens the next ones' where the setup says),
            // or the play ends (before the first action only, for some).
            if (setup.idleEnds === "round") {
              for (let guard = 0; guard < setup.rounds.length && !decided.current; guard++) {
                const limit = idleNow() ?? setup.idleMs;
                if (ms - lastActive.current < limit) break;
                act({ idle: true }, lastActive.current + limit);
              }
            } else if (setup.idleEnds === "play" || !acted) finish({ actions: actions.current, lapse: "idle" }, ms);
          }
          // A hint once the player has acted and then done nothing for a while, again after as long, in a play that goes on.
          const nudgeMs = skin.nudgeMs;
          if (!autoRecord && nudgeMs && !decided.current && actions.current.length
            && ms - Math.max(lastActive.current, lastNudge.current) >= nudgeMs) {
            lastNudge.current = ms;
            setView((current) => ({ ...current, nudge: ms }));
          }
        }
        if (skin.statusJa) {
          const text = skin.statusJa(latestView.current, setup.timeLimitMs === null ? null : Math.max(0, setup.timeLimitMs - ms));
          if (text !== shown) {
            shown = text;
            latest.current.status(text);
          }
        }
        for (const draw of draws.current) draw(ms);
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
    const hint = typeof skin.hintJa === "function" ? skin.hintJa(view) : skin.hintJa;
    return (
      <div className="mg-engine-search">
        <div className="mg-search-field">
          <Field params={params} still={still} seed={seed} cast={cast} names={names} art={art} sound={sound} vibrate={vibrate}
            setup={setup} view={view} live={live} search={search} active={active} frames={frames} />
        </div>
        <div className="mg-search-controls">
          {/* The play starts here (the host focuses it, and the result card sits just above it, over the controls): read out,
              it says how to play; Tab goes on to the buttons, Shift+Tab back to the places. */}
          {auto === null && <p className="mg-search-hint" id={hintId} tabIndex={-1} data-minigame-primary>{hint}</p>}
          {auto !== null ? <p className="mg-search-auto">{skin.autoJa}</p> : (
            <div className="mg-search-buttons">
              {skin.buttons.map((button) => (
                <button key={button.id} type="button" className={`${button.tone} mg-search-button`} data-testid={`minigame-button-${button.id}`}
                  aria-disabled={!live || undefined} aria-describedby={`${hintId}-${button.id}`}
                  onClick={() => { if (live) act({ button: button.id }, clock.now()); }}>
                  {typeof button.labelJa === "function" ? button.labelJa(view) : button.labelJa}
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
