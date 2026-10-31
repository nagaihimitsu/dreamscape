import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  balance,
  dates,
  presentation,
  battles,
  battleQuizzes,
  landmarks,
  city,
} from "../content";
import {
  advanceDate,
  chooseDate,
  createGame,
  finishDate,
  claimTrialMilestone,
  setNames,
  startDate,
  type GameState,
} from "../domain/game";
import { backupAndCreate, loadGame, saveGame } from "../persistence";
import { CanalScene } from "../components/CanalScene";
import { DialogueText } from "../components/DialogueText";
import { Modal } from "../components/Modal";
import {
  RomanceMenu,
  EventCard,
  withNames,
} from "../features/romance/RomanceMenu";
import { MemoryList } from "../features/romance/MemoryList";
import { BattleEntry } from "../features/battle/BattleEntry";
import { BattleScreen } from "../features/battle/BattleScreen";
import { TourismEntry } from "../features/tourism/TourismEntry";
import { TourismScreen } from "../features/tourism/TourismScreen";
import { ClueNotebook } from "../features/tourism/ClueNotebook";
import { useLearning } from "../features/learning/useLearning";
import { EnglishReview } from "../features/learning/EnglishReview";
import { EpisodeScreen } from "../features/journey/EpisodeScreen";
import { PendingRewards } from "../features/journey/PendingRewards";
import { CityProgress } from "../features/journey/CityProgress";
import { EpilogueScreen } from "../features/journey/EpilogueScreen";
import { startCityEpilogue, advanceCityEpilogue } from "../domain/epilogue";
import {
  canAccessFreeTime,
  getCurrentEpisode,
  getNextEpisode,
  startEpisode,
  enterFreeTime,
} from "../domain/chapter";
import { claimPendingRewards } from "../domain/rewards";
import "../features/journey/journey.css";
import {
  openTourism,
  advanceTourismGuide,
  skipTourismGuide,
  closeTourism,
  discoverClue,
  startTourismBattle,
  replayTourismGuide,
} from "../domain/tourism";
import {
  startBattle,
  advanceBattle,
  answerBattle,
  toggleBattleHint,
  getReasoningContext,
  selectReasoningClue,
  pressBattleClaim,
  submitBattleEvidence,
  leaveBattle,
} from "../domain/battle";

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
  const learning = useLearning(game);
  const [englishOpen, setEnglishOpen] = useState(
    () => !!learning.data.openQuestion,
  );
  function openEnglish(questionId?: string) {
    learning.update((s) => ({
      ...s,
      openQuestion: questionId ?? null,
      openTopic: null,
    }));
    setEnglishOpen(true);
  }
  const gameRef = useRef(game);
  const [invalid, setInvalid] = useState(
    loaded.status === "invalid" ? loaded.message : "",
  );
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [paused, setPaused] = useState(false);
  const [settings, setSettings] = useState(false);
  const [notebook, setNotebook] = useState(false);
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
      setNotebook(false);
      setNotice("保存した場面から再開しました。");
    } else
      setNotice(
        restored.status === "invalid"
          ? restored.message
          : "保存データがありません。",
      );
  }
  const active = game?.activeDate;
  const freeTimeAvailable = game ? canAccessFreeTime(game) : false;
  const idle =
    game &&
    !game.activeDate &&
    !game.activeBattle &&
    !game.activeTourism &&
    !game.activeEpilogue;
  const nextEpisode = game ? getNextEpisode(game) : null;
  const frame = active?.frame;
  useEffect(() => {
    if (active?.dateId || result || game?.endingReached)
      document.getElementById("main")?.scrollIntoView({ block: "start" });
  }, [active?.dateId, result, game?.endingReached]);
  const currentDate = dates.find((date) => date.id === active?.dateId);
  const currentBattle = battles.find(
    (battle) => battle.id === game?.activeBattle?.battleId,
  );
  const reasoningRule = currentBattle?.reasoning;
  const reasoningContext =
    game && reasoningRule ? getReasoningContext(game) : null;
  const currentLandmarkId =
    game?.activeTourism?.landmarkId ?? currentBattle?.landmarkId;
  const canObserve = landmarks.some(
    (landmark) => landmark.id === currentLandmarkId,
  );
  const cityNotebook = currentBattle?.scope === "city_finale";
  const selectedDate =
    confirmation?.kind === "date"
      ? dates.find((date) => date.id === confirmation.id)
      : undefined;
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
        <span className="edition">ミラノの旅</span>
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
      {game && (
        <div className="journey-stage" aria-label="旅の進行">
          <span>
            {reasoningRule
              ? `${landmarks.find((item) => item.id === currentLandmarkId)?.nameJa} · 特別対決`
              : game.completedCityIds.includes(city.id) &&
                  !game.activeBattle &&
                  !game.activeTourism &&
                  !game.activeEpilogue
                ? `${city.nameJa} · 都市クリア`
                : getCurrentEpisode(game).titleJa}
          </span>
          <span>
            {game.activeEpilogue
              ? "都市エピローグ"
              : game.activeTourism
                ? game.activeTourism.phase === "guide"
                  ? "観光案内"
                  : "自由な観察"
                : game.activeBattle
                  ? game.activeBattle.phase === "result"
                    ? reasoningRule
                      ? "対決の結果"
                      : "旅の一区切り"
                    : reasoningRule
                      ? "証拠で考える"
                      : "クイズバトル"
                  : freeTimeAvailable
                    ? "ふたりの自由時間"
                    : "出発前"}
          </span>
        </div>
      )}
      <main id="main">
        {learning.error && (
          <div className="notice" role="status">
            {learning.error}
          </div>
        )}
        {idle && freeTimeAvailable && (
          <div className="paper">
            <button className="secondary" onClick={() => openEnglish()}>
              英語ノートを開く
            </button>
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button className="text-button" onClick={() => setNotice("")}>
              閉じる
            </button>
          </div>
        )}
        {idle && (
          <PendingRewards
            game={game}
            onClaim={() =>
              commit((state) => claimPendingRewards(state, game.revision))
            }
          />
        )}
        {idle && freeTimeAvailable && (
          <CityProgress
            game={game}
            onStart={(id) => {
              if (commit((state) => startEpisode(state, id))) {
                setResult(false);
                setPaused(false);
              }
            }}
            onEpilogue={(id) =>
              commit((state) => startCityEpilogue(state, id, game.revision))
            }
          />
        )}
        {!game ? (
          <>
            <div className="intro-art">
              <CanalScene compact />
            </div>
            <section className="paper intro">
              <p className="eyebrow">旅のはじまり</p>
              <h1>
                予定のない午後を、
                <br />
                きみと。
              </h1>
              <p className="lead">
                街の風景に立ち止まり、奇妙な人々と出会う。
                <br />
                そのあとは、ふたりの自由時間へ。
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
        ) : game.activeEpilogue ? (
          <EpilogueScreen
            game={game}
            speed={speed}
            onSpeed={setSpeed}
            onAdvance={() =>
              commit((state) => advanceCityEpilogue(state, game.revision))
            }
          />
        ) : game.activeTourism ? (
          <TourismScreen
            key={game.activeTourism.landmarkId}
            game={game}
            speed={speed}
            onSpeed={setSpeed}
            onAdvance={() =>
              commit((state) => advanceTourismGuide(state, game.revision))
            }
            onSkip={() =>
              commit((state) => skipTourismGuide(state, game.revision))
            }
            onReplayGuide={() =>
              commit((state) => replayTourismGuide(state, game.revision))
            }
            onDiscover={(id) =>
              game.discoveredClueIds.includes(id) ||
              commit((state) => discoverClue(state, id, game.revision))
            }
            onNotebook={() => setNotebook(true)}
            onBattle={() =>
              commit((state) => startTourismBattle(state, game.revision))
            }
            onLeave={() =>
              commit((state) => closeTourism(state, game.revision))
            }
          />
        ) : game.activeBattle ? (
          <BattleScreen
            learning={learning}
            onEnglish={openEnglish}
            game={game}
            speed={speed}
            onSpeed={setSpeed}
            onNotebook={
              canObserve || cityNotebook ? () => setNotebook(true) : undefined
            }
            onClaimRewards={() =>
              commit((state) => claimPendingRewards(state, game.revision))
            }
            onAdvance={() =>
              commit((state) => advanceBattle(state, game.revision))
            }
            onAnswer={(id) =>
              commit((state) => answerBattle(state, id, game.revision))
            }
            onHint={() =>
              commit((state) => toggleBattleHint(state, game.revision))
            }
            onPress={() =>
              commit((state) => pressBattleClaim(state, game.revision))
            }
            onSubmitEvidence={() =>
              commit((state) => submitBattleEvidence(state, game.revision))
            }
            onReplay={() =>
              commit((state) => startBattle(state, game.activeBattle!.battleId))
            }
            onNextEpisode={
              !reasoningRule && nextEpisode
                ? () => {
                    if (
                      commit((state) => startEpisode(state, nextEpisode.id))
                    ) {
                      setResult(false);
                      setPaused(false);
                    }
                  }
                : undefined
            }
            nextIsFinale={nextEpisode?.kind === "city_finale"}
            onEpilogue={
              cityNotebook &&
              game.completedCityIds.includes(currentBattle.cityId!)
                ? () =>
                    commit((state) =>
                      startCityEpilogue(
                        state,
                        currentBattle.cityId!,
                        game.revision,
                      ),
                    )
                : undefined
            }
            onLeave={() => {
              if (
                commit((state) =>
                  reasoningRule
                    ? leaveBattle(state, game.revision)
                    : enterFreeTime(state, game.revision),
                )
              ) {
                setResult(false);
                setPaused(false);
              }
            }}
          />
        ) : !freeTimeAvailable ? (
          <EpisodeScreen
            game={game}
            onStart={(id) => commit((state) => startEpisode(state, id))}
          />
        ) : active && frame ? (
          <>
            <CanalScene compact backgroundId={frame.background} />
            <section className="paper story-paper" aria-label="デートの会話">
              <div className="section-meta">
                <span className="eyebrow">{currentDate?.titleJa}</span>
                <span className="fine-print">
                  会話{" "}
                  {Math.min(
                    active.choiceCount + 1,
                    currentDate?.choiceCount ?? 2,
                  )}{" "}
                  / {currentDate?.choiceCount ?? 2}
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
                      {currentDate?.kind === "normal"
                        ? "デートを終える"
                        : "この時間を終える"}{" "}
                      <span aria-hidden="true">→</span>
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
        ) : game.endingReached ? (
          <>
            <CanalScene backgroundId="milano_night" />
            <section className="paper ending" data-testid="romance-ending">
              <p className="eyebrow">交際開始 · 恋愛ルートクリア</p>
              <h1>{presentation.ending.titleJa}</h1>
              <p className="ending-names">
                {game.playerName}
                <span> & </span>
                {game.heroineName}
              </p>
              <p className="lead">
                {withNames(presentation.ending.descriptionJa, game)}
              </p>
              <p className="fine-print">
                ふたりの物語は、ここでひと区切り。
                <br />
                ここまでの旅は保存されています。
              </p>
              <details className="memories">
                <summary>{presentation.ending.buttonJa}</summary>
                <MemoryList ids={game.memories} />
              </details>
              {dates
                .filter(
                  (date) =>
                    date.allowAfterEnding &&
                    date.requiredCompletedCityIds?.every((id) =>
                      game.completedCityIds.includes(id),
                    ),
                )
                .map((date) => (
                  <div className="city-after-romance" key={date.id}>
                    <h2>旅の終わりに、もうひととき</h2>
                    <EventCard
                      game={game}
                      date={date}
                      onChoose={(id) => setConfirmation({ kind: "date", id })}
                    />
                  </div>
                ))}
            </section>
          </>
        ) : (
          <>
            {result && <CanalScene compact />}
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
                <RomanceMenu
                  game={game}
                  onChoose={(id) => setConfirmation({ kind: "date", id })}
                  onMilestone={(id) =>
                    commit((state) => claimTrialMilestone(state, id))
                  }
                />
              )}
            </section>
          </>
        )}
        {idle && freeTimeAvailable && (
          <details className="revisit-menu">
            <summary>旅先を再訪する</summary>
            <p className="fine-print">
              同じ場所をもう一度訪ねられます。初回報酬の再取得はありません。
            </p>
            <TourismEntry
              game={game}
              onStart={(id) => {
                if (commit((state) => openTourism(state, id))) {
                  setResult(false);
                  setPaused(false);
                }
              }}
            />
            <BattleEntry
              game={game}
              onStart={(id) => {
                if (commit((state) => startBattle(state, id))) {
                  setResult(false);
                  setPaused(false);
                }
              }}
            />
          </details>
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
          <span>自動保存・前の状態には戻れません</span>
        </nav>
      )}
      <footer>
        Dreamscape <span>·</span> 旅の余白に、ふたりの物語。
      </footer>
      {notebook && game && (canObserve || cityNotebook) && (
        <ClueNotebook
          landmarkId={currentLandmarkId ?? undefined}
          cityId={cityNotebook ? currentBattle.cityId : undefined}
          discoveredIds={game.discoveredClueIds}
          onClose={() => setNotebook(false)}
          reasoning={
            reasoningRule &&
            currentBattle &&
            game.activeBattle &&
            reasoningContext &&
            !game.activeTourism
              ? {
                  caseClueIds: reasoningRule.caseClueIds,
                  claimText: reasoningContext.claimText,
                  questionEn:
                    battleQuizzes[currentBattle.quizId].questions[
                      game.activeBattle.roundIndex
                    ].questionEn,
                  selectedIds:
                    game.activeBattle.reasoning?.selectedClueIds ?? [],
                  maxSelections: reasoningRule.kind === "contradiction" ? 1 : 2,
                  selectionEnabled: game.activeBattle.phase === "reasoning",
                  onSelect: (id) =>
                    commit((state) =>
                      selectReasoningClue(state, id, game.revision),
                    ),
                }
              : undefined
          }
          onObserve={
            !game.activeTourism && !reasoningRule && currentLandmarkId
              ? () => {
                  if (commit((state) => openTourism(state, currentLandmarkId)))
                    setNotebook(false);
                }
              : undefined
          }
        />
      )}
      {englishOpen && game && (
        <EnglishReview
          game={game}
          learning={learning}
          onClose={() => {
            learning.update((s) => ({
              ...s,
              openQuestion: null,
              openTopic: null,
            }));
            setEnglishOpen(false);
          }}
        />
      )}
      {confirmation && (
        <Modal labelledBy="confirm-title" onClose={() => setConfirmation(null)}>
          <p className="eyebrow">
            {confirmation.kind === "date" ? "デートのお誘い" : "言葉を選ぶ"}
          </p>
          <h2 id="confirm-title">
            {confirmation.kind === "date"
              ? `${selectedDate?.titleJa}を始めますか？`
              : "この言葉を伝えますか？"}
          </h2>
          <p className="confirm-text">
            {confirmation.kind === "date"
              ? selectedDate?.apCost
                ? `${selectedDate.apCost}APを使って、デートを始めます。`
                : "APは使いません。ふたりの時間を始めます。"
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
              ? selectedDate?.apCost
                ? "APを使って始める"
                : "この時間を過ごす"
              : "この言葉を伝える"}
          </button>
          <button className="secondary" onClick={() => setConfirmation(null)}>
            選び直す
          </button>
        </Modal>
      )}
      {settings && game && (
        <Modal labelledBy="settings-title" onClose={() => setSettings(false)}>
          <h2 id="settings-title">設定</h2>
          <label className="translation-setting">
            <input
              type="checkbox"
              checked={learning.data.alwaysTranslate}
              onChange={(event) =>
                learning.update((s) => ({
                  ...s,
                  alwaysTranslate: event.target.checked,
                  revealed: {},
                }))
              }
            />{" "}
            常に日本語訳を表示する
          </label>
          <h3>名前の設定</h3>
          {active ||
          game.activeBattle ||
          game.activeTourism ||
          game.activeEpilogue ? (
            <p>進行中の会話やバトル・観光を閉じると、名前を変更できます。</p>
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
