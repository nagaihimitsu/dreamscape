import { useEffect, useMemo, useRef, useState } from "react";
import { balance, tagContext } from "../content";
import { holdSceneCues, useSoundEffectSettings } from "../audio/sound-effects";
import { canVibrate, useVibrationSetting } from "../audio/vibration";
import { CanalScene } from "../components/CanalScene";
import { usePresentationSettings } from "../components/usePresentationSettings";
import { ChoicePoint } from "../minigames/host/ChoicePoint";
import { MiniGameProvider, MiniGameSlot, type MiniGameEnvironment } from "../minigames/host/MiniGameProvider";
import { MINI_GAME_IDS, MINI_GAMES } from "../minigames/registry";
import { miniGameParamKeys, type MiniGameTag } from "../minigames/tag";
import type { MiniGameModule } from "../minigames/contract";
import type { MiniGameUse } from "../minigames/uses";
import { miniGameUses, miniGameUseUrl, usesProblem } from "./minigame-room";
import "../features/romance/romance-scene.css";
import "./minigame-room.css";

// Debug's 「ミニゲームの見本」 (docs/13 6.6): every registered game, its outcomes, keys, art slots and uses, and a stage to
// play each with its examples and a use's pictures (by hand, by each 「おまかせ」 outcome, with less motion) through the
// game's own host, without a story or a save. It runs on the Debug page only (DebugMode shows it in place of 場面の確認).
// It reads and writes no save, English notebook, presentation setting or Debug-mode key: its settings live in its own memory.

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
}

/**
 * The room's stage: one game, its example params, the pictures of one of its uses (an index of picturedUses, -1 for the
 * game's own drawing), how it is played, the outcomes it plays as greyed (their fallbacks are taken), its tuning numbers
 * changed for the next play (E2; never saved) and a slow phone's input delay (E3).
 */
type Stage = {
  gameId: string; example: number; pictures: number; auto: string | null; still: boolean; closed: readonly string[];
  tuning: Readonly<Record<string, number>>; delay: number;
};
/** A slow phone's feel: every input read this much later (E3). */
const INPUT_DELAYS = [0, 60, 120] as const;

/** A game's uses that give it pictures (`bg`, `art.<slot>`), each set of pictures once: the stage can show each. */
function picturedUses(gameId: string): MiniGameUse[] {
  const seen = new Set<string>();
  return miniGameUses.filter((use) => {
    const key = JSON.stringify([use.bg ?? null, Object.entries(use.art ?? {}).sort()]);
    if (use.game !== gameId || (!use.bg && !use.art) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
const picturesLabel = (use: MiniGameUse) =>
  [use.bg ? `bg ${use.bg}` : "", ...Object.entries(use.art ?? {}).sort().map(([slot, image]) => `art.${slot} ${image}`)].filter(Boolean).join(" ");

export function MiniGameRoom({ onClose }: { onClose: () => void }) {
  const [storage] = useState(memoryStorage);
  const settings = usePresentationSettings(storage);
  const [vibrationAvailable] = useState(() => canVibrate(typeof navigator === "undefined" ? undefined : navigator));
  // The game's sounds and vibration with the room's settings (the game's defaults).
  useSoundEffectSettings(settings.value.se, settings.value.seVolume);
  useVibrationSetting(vibrationAvailable && settings.value.vibration);
  useEffect(() => {
    holdSceneCues(false);
  }, []);
  const [stage, setStage] = useState<Stage | null>(null);
  const [round, setRound] = useState(0);
  const [last, setLast] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const openedFrom = useRef<string | null>(null);
  // Each use's 「Debugで開く」: a date whose story asks whether an item is held is walked to the use's own branch (a
  // second or two to build the cleared city), so the links are worked out once, after the list has shown.
  const [links, setLinks] = useState<ReadonlyMap<MiniGameUse, ReturnType<typeof miniGameUseUrl>> | null>(null);
  useEffect(() => {
    let timer = 0;
    const frame = window.requestAnimationFrame(() => {
      timer = window.setTimeout(() => setLinks(new Map(miniGameUses.map((use) => [use, miniGameUseUrl(use)]))), 0);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
    // Back from a game's stage: the focus goes back to its 「遊んでみる」.
    if (!stage && openedFrom.current) document.querySelector<HTMLElement>(`[data-testid="minigame-room-open-${openedFrom.current}"]`)?.focus({ preventScroll: true });
  }, [stage]);

  const definition = stage ? MINI_GAMES[stage.gameId] : null;
  // The game's play file, for its tuning numbers (the same file its play loads).
  const [module, setModule] = useState<MiniGameModule | null>(null);
  useEffect(() => {
    setModule(null);
    if (!definition) return;
    let live = true;
    definition.load().then((loaded) => { if (live) setModule(loaded); }, () => undefined);
    return () => { live = false; };
  }, [definition]);
  const environment = useMemo<MiniGameEnvironment>(() => ({
    auto: stage?.auto !== null && stage?.auto !== undefined,
    debug: true,
    reduceMotion: !!stage?.still,
    names: { player: balance.defaultPlayerName, heroine: balance.defaultHeroineName },
    revision: round,
    context: tagContext,
    ...(stage?.closed.length && definition ? { available: definition.outcomes.map((outcome) => outcome.id).filter((id) => !stage.closed.includes(id)) } : {}),
    // The room has no choice to take: it notes the outcome and sets the game up again.
    onOutcome: (outcome) => {
      setLast(outcome);
      setRound((count) => count + 1);
      return true;
    },
    backdrop: (backgroundId) => <CanalScene backgroundId={backgroundId} />,
    // The room always offers 「もう一回」 on the result card, and plays the edited numbers and the input delay.
    retry: true,
    ...(stage && Object.keys(stage.tuning).length ? { tuning: stage.tuning } : {}),
    ...(stage?.delay ? { inputDelayMs: stage.delay } : {}),
  }), [stage?.auto, stage?.still, stage?.closed, stage?.tuning, stage?.delay, definition, round]);
  const pictured = useMemo(() => (stage ? picturedUses(stage.gameId) : []), [stage]);
  // What the edited numbers would make unfair (the game's engine checks; the play still runs, to feel it).
  const unfair = useMemo<readonly string[]>(() => {
    if (!module?.fairness || !module.tuning || !stage || !Object.keys(stage.tuning).length) return [];
    try {
      return module.fairness({ ...module.tuning, ...stage.tuning });
    } catch (error) {
      return [`公平さを調べられませんでした：${error instanceof Error ? error.message : String(error)}`];
    }
  }, [module, stage]);
  const tag = useMemo<MiniGameTag | undefined>(() => {
    if (!stage || !definition) return undefined;
    const params = definition.examples[stage.example] ?? {};
    const pictures = pictured[stage.pictures];
    return { id: definition.id, auto: stage.auto ?? definition.defaultAuto, ...(pictures?.bg ? { bg: pictures.bg } : {}),
      ...(pictures?.art ? { art: pictures.art } : {}), ...(Object.keys(params).length ? { params } : {}) };
  }, [stage, definition, pictured]);
  const change = (next: Partial<Stage>) => {
    setStage((current) => (current ? { ...current, ...next } : current));
    setLast(null);
    setRound((count) => count + 1);
  };

  if (stage && definition && tag) return (
    <main className="minigame-room" data-testid="minigame-room-stage" data-game={definition.id} data-timed={definition.timed || undefined}>
      <header className="minigame-room-head">
        <h1 ref={heading} tabIndex={-1}>{definition.titleJa}</h1>
        <button type="button" className="minigame-room-close" data-testid="minigame-room-back" onClick={() => setStage(null)}>一覧へ戻る</button>
      </header>
      {/* The stage first, in view as the room opens: its start and its play's controls without scrolling. */}
      <MiniGameProvider value={environment}>
        <div className="vn-scene minigame-room-stage">
          <div className="vn-background"><CanalScene /></div>
          <div className="minigame-room-window paper">
            <p className="minigame-room-line">（ここまでの台詞のあと、選択肢の代わりにゲームが始まります）</p>
            <ChoicePoint key={round} minigame={tag} ready cast={{ heroine: { emotion: "neutral" } }} />
          </div>
          <MiniGameSlot />
        </div>
      </MiniGameProvider>
      <fieldset className="minigame-room-controls">
        <legend>遊び方</legend>
        <label><input type="radio" name="minigame-room-auto" checked={stage.auto === null} onChange={() => change({ auto: null })}
          data-testid="minigame-room-hand" /> 自分で遊ぶ</label>
        {definition.outcomes.map((outcome) => (
          <label key={outcome.id}><input type="radio" name="minigame-room-auto" checked={stage.auto === outcome.id} onChange={() => change({ auto: outcome.id })}
            data-testid={`minigame-room-auto-${outcome.id}`} /> おまかせ：{outcome.labelJa}</label>
        ))}
        <label className="minigame-room-still"><input type="checkbox" checked={stage.still} onChange={(event) => change({ still: event.target.checked })}
          data-testid="minigame-room-still" /> 動きを減らす</label>
        {/* An outcome with a fallback may be greyed in a story (a price the player cannot pay): play it so (docs/13 4.2). */}
        {definition.outcomes.filter((outcome) => outcome.fallback).map((outcome) => (
          <label key={outcome.id}><input type="checkbox" checked={stage.closed.includes(outcome.id)} data-testid={`minigame-room-closed-${outcome.id}`}
            onChange={(event) => change({ closed: event.target.checked ? [...stage.closed, outcome.id] : stage.closed.filter((id) => id !== outcome.id) })} />
            選べないことにする：{outcome.labelJa}（代わりに {outcome.fallback}）</label>
        ))}
        {/* A slow phone's feel (E3): every press is read later by this much. */}
        <fieldset className="minigame-room-delay">
          <legend>押す遅れ（遅い端末の再現）</legend>
          {INPUT_DELAYS.map((delay) => (
            <label key={delay}><input type="radio" name="minigame-room-delay" checked={stage.delay === delay} onChange={() => change({ delay })}
              data-testid={`minigame-room-delay-${delay}`} /> +{delay} ms</label>
          ))}
        </fieldset>
        {definition.examples.length > 1 && <label className="minigame-room-example">札の引数の例
          <select value={stage.example} onChange={(event) => change({ example: Number(event.target.value) })}>
            {definition.examples.map((example, index) => <option key={index} value={index}>{Object.entries(example).map(([key, value]) => `${key} ${value}`).join(" ") || "（なし）"}</option>)}
          </select>
        </label>}
        {/* The pictures a story gives the game (bg, art.<slot>): a use's, or the game's own drawing. */}
        {pictured.length > 0 && <label className="minigame-room-example minigame-room-pictures">絵（使っている場面の bg・art）
          <select value={stage.pictures} data-testid="minigame-room-pictures" onChange={(event) => change({ pictures: Number(event.target.value) })}>
            {pictured.map((use, index) => <option key={index} value={index}>{use.sceneId}：{picturesLabel(use)}</option>)}
            <option value={-1}>なし（ゲームが描く絵）</option>
          </select>
        </label>}
      </fieldset>
      {/* The game's tuning (E1, E2): each number of its one named object, changed for the next play only (never saved). */}
      <fieldset className="minigame-room-controls minigame-room-tuning" data-testid="minigame-room-tuning">
        <legend>調整の値（次の1回から。保存しません）</legend>
        {!module ? <p>読み込み中…</p> : !module.tuning ? <p>このゲームは調整の値を宣言していません（play.ts の tuning）。</p> : <>
          {!module.retune && <p>このゲームは値を変えて遊べません（play.ts に retune がありません）。</p>}
          {Object.entries(module.tuning).map(([key, value]) => (
            <label key={key} className="minigame-room-number">{key}
              <input type="number" inputMode="numeric" step="any" disabled={!module.retune} value={stage.tuning[key] ?? value}
                data-testid={`minigame-room-tuning-${key}`}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (event.target.value !== "" && Number.isFinite(next)) change({ tuning: { ...stage.tuning, [key]: next } });
                }} />
              {stage.tuning[key] !== undefined && stage.tuning[key] !== value && <span className="minigame-room-was">（元は {value}）</span>}
            </label>
          ))}
          {unfair.length > 0 && (
            <div className="minigame-room-unfair" role="status" data-testid="minigame-room-unfair">
              <p>この値では、スマートフォンで公平に遊べないかもしれません（エンジンの公平さの検査）：</p>
              <ul>{unfair.map((problem) => <li key={problem}>{problem}</li>)}</ul>
            </div>
          )}
          {Object.keys(stage.tuning).length > 0 && <button type="button" className="secondary" data-testid="minigame-room-tuning-reset"
            onClick={() => change({ tuning: {} })}>元の値に戻す</button>}
        </>}
      </fieldset>
      <p className="minigame-room-last" role="status" data-testid="minigame-room-last">
        {last ? `前の結果：${definition.outcomes.find((outcome) => outcome.id === last)?.labelJa ?? last}（${last}）` : "まだ遊んでいません。"}
      </p>
    </main>
  );

  return (
    <main className="minigame-room" data-testid="minigame-room">
      <header className="minigame-room-head">
        <h1 ref={heading} tabIndex={-1}>ミニゲームの見本</h1>
        <button type="button" className="minigame-room-close" onClick={onClose}>場面の確認へ戻る</button>
      </header>
      <p className="minigame-room-note">
        Debug専用の確認の部屋です。登録されているミニゲームを、物語やセーブなしに、札の引数の例で遊べます（自分で・おまかせの各結果で・動きを減らして・押す遅れを足して）。
        結果のカードの「もう一回」ですぐやり直せ、調整の値は次の1回から変えて試せます。
        セーブ・英語ノート・⚙設定・ゲームの進行は何も変えません。書き方は authoring/CONTENT_GUIDE.md の「ミニゲーム」にあります。
      </p>
      {usesProblem && <p className="minigame-room-off" role="alert">使っている場面の一覧（minigame-uses.json）を読めませんでした。npm run content:build で作り直してください。</p>}
      {MINI_GAME_IDS.map((id) => {
        const game = MINI_GAMES[id];
        const keys = miniGameParamKeys(game, tagContext);
        const uses = miniGameUses.filter((use) => use.game === id);
        return (
          <section key={id} className="minigame-room-game" data-testid={`minigame-room-${id}`} data-game={id} aria-labelledby={`minigame-room-title-${id}`}>
            <h2 id={`minigame-room-title-${id}`}>{game.titleJa}<span className="minigame-room-id">{id}</span></h2>
            <p>{game.howToJa}</p>
            <dl className="minigame-room-facts">
              <dt>仕組み</dt><dd>{game.engine}</dd>
              <dt>キーボード</dt><dd>{game.keysJa ?? "なし（おまかせで進む）"}</dd>
              <dt>時間</dt><dd>{game.timed ? "時間で進む（裏に回ると一時停止）" : "時間で進まない"}</dd>
            </dl>
            <h3>結果（# option: の ID）</h3>
            <ul>{game.outcomes.map((outcome) => <li key={outcome.id}>{outcome.labelJa}（{outcome.id}）{outcome.noteJa ? `：${outcome.noteJa}` : ""}
              {outcome.id === game.defaultAuto ? "　※おまかせの既定" : ""}</li>)}</ul>
            <h3>札の引数</h3>
            {keys.length ? <ul>{keys.map((item) => <li key={item.key}>{item.key}：{item.descriptionJa}</li>)}</ul> : <p>なし（ゲーム自身の引数はありません）</p>}
            <h3>絵（art.&lt;名前&gt;）</h3>
            {game.artSlots.length ? <ul>{game.artSlots.map((slot) => <li key={slot.id}>art.{slot.id}（{slot.kind === "sprite" ? "人物・物：webp か png、背景は透明" : "背景"}）：{slot.labelJa}</li>)}</ul>
              : <p>なし</p>}
            <h3>使っている場面</h3>
            {uses.length ? <ul>{uses.map((use) => {
              const opened = links?.get(use);
              return <li key={`${use.sceneId}:${use.knot}:${use.prefix ?? ""}:${use.line}`}>
                {use.sceneId}{use.knot && use.knot !== use.sceneId ? `（${use.knot}）` : ""}：auto {use.auto}{use.prefix ? `・prefix ${use.prefix}` : ""}
                {!opened ? <span className="minigame-room-reason">（開くリンクを準備中…）</span>
                  : "url" in opened ? <> <a href={opened.url}>Debugで開く</a></> : <span className="minigame-room-reason">（{opened.reason}）</span>}
              </li>;
            })}</ul> : <p>まだありません。</p>}
            <button type="button" className="secondary minigame-room-open" data-testid={`minigame-room-open-${id}`} onClick={() => {
              openedFrom.current = id;
              setLast(null);
              setRound((count) => count + 1);
              setStage({ gameId: id, example: 0, pictures: picturedUses(id).length ? 0 : -1, auto: null, still: false, closed: [], tuning: {}, delay: 0 });
            }}>遊んでみる</button>
          </section>
        );
      })}
    </main>
  );
}
