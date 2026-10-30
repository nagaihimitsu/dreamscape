import { useCallback, useRef, useState, type FormEvent } from "react";
import { balance, city, dates, presentation } from "../content";
import {
  advanceDate,
  chooseDate,
  completeChapter,
  createGame,
  finishDate,
  getDateAvailability,
  setNames,
  startDate,
  type GameState,
} from "../domain/game";
import { backupAndCreate, loadGame, saveGame } from "../persistence";
import { CanalScene } from "../components/CanalScene";
import { DialogueText } from "../components/DialogueText";
import { Modal } from "../components/Modal";

const storage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) =>
    window.localStorage.setItem(key, value),
};
type Confirmation =
  | { kind: "date"; id: string }
  | { kind: "choice"; index: number; text: string; revision: number };

export default function App() {
  const [loaded] = useState(() => loadGame(storage));
  const [game, setGame] = useState<GameState | null>(
    loaded.status === "loaded" ? loaded.state : null,
  );
  const gameRef = useRef(game);
  const [invalid, setInvalid] = useState(
    loaded.status === "invalid" ? loaded.message : "",
  );
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [paused, setPaused] = useState(false);
  const [settings, setSettings] = useState(false);
  const [speed, setSpeed] = useState(25);
  const [ready, setReady] = useState(false);
  const onReady = useCallback((value: boolean) => setReady(value), []);
  const [result, setResult] = useState(false);
  const [player, setPlayer] = useState(
    game?.playerName ?? balance.defaultPlayerName,
  );
  const [heroine, setHeroine] = useState(
    game?.heroineName ?? balance.defaultHeroineName,
  );

  function adopt(next: GameState) {
    gameRef.current = next;
    setGame(next);
  }
  function commit(change: (state: GameState) => GameState) {
    if (!gameRef.current) return false;
    const next = change(gameRef.current);
    if (next === gameRef.current) return false;
    const saved = saveGame(storage, next, gameRef.current);
    if (!saved.ok) {
      setNotice(saved.message);
      return false;
    }
    adopt(next);
    setNotice("");
    return true;
  }
  function begin(event: FormEvent) {
    event.preventDefault();
    const next = createGame(player.trim(), heroine.trim());
    const saved = invalid
      ? backupAndCreate(storage, next)
      : saveGame(storage, next);
    if (!saved.ok) {
      setNotice(saved.message);
      return;
    }
    adopt(next);
    setInvalid("");
    setNotice("");
  }
  function save() {
    if (!gameRef.current) return;
    const saved = saveGame(storage, gameRef.current);
    setNotice(saved.ok ? "現在の場面を保存しました。" : saved.message);
  }
  function reload() {
    const restored = loadGame(storage);
    if (restored.status === "loaded") {
      adopt(restored.state);
      setConfirmation(null);
      setResult(false);
      setPaused(false);
      setNotice("保存した場面から再開しました。");
    } else
      setNotice(
        restored.status === "invalid"
          ? restored.message
          : "保存データがありません。",
      );
  }
  const active = game?.activeDate;
  const frame = active?.frame;
  const currentDate = dates.find((date) => date.id === active?.dateId);
  const nameForm = (
    <>
      <label>
        主人公の名前
        <input
          name="playerName"
          value={player}
          maxLength={balance.maxNameLength}
          required
          onChange={(e) => setPlayer(e.target.value)}
          autoComplete="off"
        />
      </label>
      <label>
        ヒロインの名前
        <input
          name="heroineName"
          value={heroine}
          maxLength={balance.maxNameLength}
          required
          onChange={(e) => setHeroine(e.target.value)}
          autoComplete="off"
        />
      </label>
    </>
  );

  return (
    <div className="app-shell">
      <header className="masthead">
        <a href="#main" className="brand">
          Dreamscape<span>旅の余白</span>
        </a>
        <span className="edition">ミラノ編 · 試遊版</span>
      </header>
      {game && (
        <div className="journey-bar">
          <span className="travelers">
            {game.playerName}
            <span className="amp"> と </span>
            {game.heroineName}
          </span>
          <span className="ap" aria-label={`残り${game.ap}AP`}>
            {game.ap}
            <small> AP</small>
          </span>
        </div>
      )}
      <main id="main">
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button className="text-button" onClick={() => setNotice("")}>
              閉じる
            </button>
          </div>
        )}
        {!game ? (
          <>
            <CanalScene />
            <section className="paper intro">
              <p className="eyebrow">旅のはじまり</p>
              <h1>
                予定のない午後を、
                <br />
                きみと。
              </h1>
              <p className="lead">
                旅先で見つけた、小さな自由時間。
                <br />
                どんな言葉を交わすかは、あなた次第。
              </p>
              {invalid && (
                <div className="notice warning" role="alert">
                  <strong>保存データを読み込めませんでした</strong>
                  <p>{invalid}</p>
                  <p>
                    元のデータは残っています。下の操作でバックアップを保存してから、新しい旅を始められます。
                  </p>
                </div>
              )}
              <form onSubmit={begin} className="name-form">
                {nameForm}
                <button
                  className="primary"
                  disabled={!player.trim() || !heroine.trim()}
                >
                  {invalid
                    ? "元のデータを退避して新しく始める"
                    : "旅をはじめる"}
                  <span aria-hidden="true"> →</span>
                </button>
              </form>
              <p className="fine-print">
                このブラウザに自動保存されます。
                <br />
                名前はあとから設定で変更できます。
              </p>
            </section>
          </>
        ) : !game.completedChapters.includes("milano") ? (
          <>
            <CanalScene />
            <section className="paper">
              <p className="eyebrow">第1章 · ミラノ</p>
              <h1>
                旅のあとに、
                <br />
                ふたりの時間。
              </h1>
              <p className="lead">
                まずはミラノ章を仮クリアして、
                <br />
                自由時間へ進みましょう。
              </p>
              <div className="chapter-note">
                <span className="pill">開発用操作</span>
                <p>
                  この試遊版では、章クリア後のカフェデートを遊べます。初回クリアで、デートに誘うためのAPがもらえます。
                </p>
              </div>
              <button
                className="primary"
                onClick={() =>
                  commit((state) => completeChapter(state, "milano"))
                }
              >
                ミラノ章初回クリア <span>＋{city.firstClearReward.ap} AP</span>
              </button>
            </section>
          </>
        ) : active && frame ? (
          <>
            <CanalScene compact backgroundId={frame.background} />
            <section className="paper story-paper" aria-label="デートの会話">
              <div className="section-meta">
                <span className="eyebrow">{currentDate?.titleJa}</span>
                <span className="fine-print">
                  会話 {Math.min(active.choiceCount + 1, 2)} / 2
                </span>
              </div>
              <div className="speaker">
                <span
                  className={`speaker-dot ${frame.emotion}`}
                  aria-hidden="true"
                />
                {frame.speaker === "heroine"
                  ? game.heroineName
                  : frame.speaker === "player"
                    ? game.playerName
                    : "旅の風景"}
                {frame.speaker === "heroine" && frame.emotion !== "neutral" && (
                  <span className="emotion">
                    {presentation.emotions[frame.emotion]}
                  </span>
                )}
              </div>
              {paused ? (
                <div className="paused">
                  <h1>ひと休み</h1>
                  <p>
                    ここまでの会話は保存されています。
                    <br />
                    同じ場面から続きをどうぞ。
                  </p>
                  <button className="primary" onClick={() => setPaused(false)}>
                    デートを再開する
                  </button>
                </div>
              ) : (
                <>
                  <DialogueText
                    key={game.revision}
                    text={frame.text}
                    speed={speed}
                    onReady={onReady}
                  />
                  {frame.choices.length ? (
                    <div className="choices">
                      <p className="choice-hint">
                        あなたは、どう返す？<span>選んでから確定できます</span>
                      </p>
                      {frame.choices.map((choice, index) => (
                        <button
                          disabled={!ready}
                          key={`${game.revision}-${choice.index}`}
                          className="choice"
                          onClick={() =>
                            setConfirmation({
                              kind: "choice",
                              index: choice.index,
                              text: choice.text,
                              revision: game.revision,
                            })
                          }
                        >
                          <span className="choice-number">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span>{choice.text}</span>
                        </button>
                      ))}
                    </div>
                  ) : frame.ended ? (
                    <button
                      disabled={!ready}
                      className="primary"
                      onClick={() => {
                        if (commit((state) => finishDate(state, game.revision)))
                          setResult(true);
                      }}
                    >
                      デートを終える <span aria-hidden="true">→</span>
                    </button>
                  ) : (
                    <button
                      disabled={!ready}
                      className="next"
                      onClick={() =>
                        commit((state) => advanceDate(state, game.revision))
                      }
                    >
                      続きを読む <span aria-hidden="true">→</span>
                    </button>
                  )}
                  <div className="story-tools">
                    <button
                      className="text-button"
                      onClick={() => {
                        setPaused(true);
                        setConfirmation(null);
                      }}
                    >
                      中断する
                    </button>
                    <label>
                      文字送り
                      <select
                        aria-label="文字送り"
                        value={speed}
                        onChange={(e) => setSpeed(Number(e.target.value))}
                      >
                        <option value={45}>ゆっくり</option>
                        <option value={25}>ふつう</option>
                        <option value={0}>一括表示</option>
                      </select>
                    </label>
                  </div>
                </>
              )}
            </section>
          </>
        ) : (
          <>
            <CanalScene />
            <section className="paper">
              <p className="eyebrow">
                {result ? "デートの余韻" : "章末 · 恋愛モード"}
              </p>
              <h1>{result ? "今日が、思い出になる。" : "ふたりの自由時間"}</h1>
              <p className="lead">
                {result
                  ? "交わした言葉を、旅のしおりに。"
                  : "旅の予定は、ここでひと休み。"}
                <br />
                {result
                  ? "残ったAPは、次の機会に持ち越せます。"
                  : "残った時間を、一緒に過ごしませんか。"}
              </p>
              {result ? (
                <>
                  <MemoryList ids={game.memories} />
                  <button className="primary" onClick={() => setResult(false)}>
                    自由時間に戻る <span aria-hidden="true">→</span>
                  </button>
                </>
              ) : (
                <>
                  {dates.map((date) => {
                    const eligibility = getDateAvailability(game, date.id);
                    return (
                      <article className="date-card" key={date.id}>
                        <div className="section-meta">
                          <span className="pill">
                            {game.playedDateIds.includes(date.id)
                              ? "体験済み"
                              : "未体験"}
                          </span>
                          <span className="cost">{date.apCost} AP</span>
                        </div>
                        <h2>{date.titleJa}</h2>
                        <p>{date.descriptionJa}</p>
                        <p className="date-detail">
                          必要な章：ミラノ クリア済み
                        </p>
                        <button
                          className="primary"
                          disabled={!eligibility.available}
                          onClick={() =>
                            setConfirmation({ kind: "date", id: date.id })
                          }
                        >
                          {game.playedDateIds.includes(date.id)
                            ? "もう一度誘う"
                            : "カフェデートに誘う"}
                          <span aria-hidden="true"> →</span>
                        </button>
                        {!eligibility.available && (
                          <p role="status">{eligibility.reason}</p>
                        )}
                        {game.playedDateIds.includes(date.id) && (
                          <p className="fine-print">
                            再鑑賞にもAPを使います。好感度や思い出の追加獲得はありません。
                          </p>
                        )}
                      </article>
                    );
                  })}
                  <p className="fine-print ap-help">
                    APは一緒に過ごす機会のために。
                    <br />
                    どんな時間になるかは、交わす言葉から。
                  </p>
                  {!!game.memories.length && (
                    <details className="memories">
                      <summary>
                        旅のしおり · 思い出 {game.memories.length}件
                      </summary>
                      <MemoryList ids={game.memories} />
                    </details>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>
      {game && (
        <nav className="save-tools" aria-label="セーブと設定">
          <button onClick={save}>セーブ</button>
          <button onClick={reload}>ロード</button>
          <button
            onClick={() => {
              setPlayer(game.playerName);
              setHeroine(game.heroineName);
              setSettings(true);
            }}
          >
            設定
          </button>
          <span>進行は自動保存</span>
        </nav>
      )}
      <footer>
        Dreamscape <span>·</span> 旅の余白に、ふたりの物語。
      </footer>
      {confirmation && (
        <Modal labelledBy="confirm-title" onClose={() => setConfirmation(null)}>
          <p className="eyebrow">
            {confirmation.kind === "date" ? "デートのお誘い" : "言葉を選ぶ"}
          </p>
          <h2 id="confirm-title">
            {confirmation.kind === "date"
              ? "カフェに誘いますか？"
              : "この言葉を伝えますか？"}
          </h2>
          <p className="confirm-text">
            {confirmation.kind === "date"
              ? `${dates.find((d) => d.id === confirmation.id)?.apCost}APを使って、デートを始めます。`
              : confirmation.text}
          </p>
          <button
            autoFocus
            className="primary"
            onClick={() => {
              const selected = confirmation;
              setConfirmation(null);
              if (selected.kind === "date") {
                commit((state) => startDate(state, selected.id));
                setResult(false);
              } else
                commit((state) =>
                  chooseDate(state, selected.index, selected.revision),
                );
            }}
          >
            {confirmation.kind === "date"
              ? "APを使って始める"
              : "この言葉を伝える"}
          </button>
          <button className="secondary" onClick={() => setConfirmation(null)}>
            選び直す
          </button>
        </Modal>
      )}
      {settings && game && (
        <Modal labelledBy="settings-title" onClose={() => setSettings(false)}>
          <h2 id="settings-title">名前の設定</h2>
          {active ? (
            <p>デートを終えたあとで、名前を変更できます。</p>
          ) : (
            <form
              className="name-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (player.trim() && heroine.trim()) {
                  commit((state) =>
                    setNames(state, player.trim(), heroine.trim()),
                  );
                  setSettings(false);
                }
              }}
            >
              {nameForm}
              <button
                className="primary"
                disabled={!player.trim() || !heroine.trim()}
              >
                名前を保存
              </button>
            </form>
          )}
          <button
            className="secondary"
            autoFocus
            onClick={() => setSettings(false)}
          >
            閉じる
          </button>
        </Modal>
      )}
    </div>
  );
}
function MemoryList({ ids }: { ids: string[] }) {
  return (
    <ul className="memory-list">
      {ids.map((id) => (
        <li key={id}>
          <span aria-hidden="true">✧</span>
          <div>
            <h3>{presentation.memories[id]?.titleJa ?? id}</h3>
            <p>{presentation.memories[id]?.descriptionJa}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
