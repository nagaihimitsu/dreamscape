import { useEffect, useRef, useState, type FormEvent } from "react";
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
import {
  backupAndCreate,
  deleteSaveData,
  LEARNING_KEY,
  SAVE_KEY,
  loadGame,
  saveGame,
} from "../persistence";
import { CanalScene } from "../components/CanalScene";
import { usePresentationSettings } from "../components/usePresentationSettings";
import { RomanceScene } from "../features/romance/RomanceScene";
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
  removeItem: (key: string) => window.localStorage.removeItem(key),
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
  const displaySettings = usePresentationSettings();
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
  const [deleteSnapshot, setDeleteSnapshot] = useState<{
    game: string | null;
    learning: string | null;
  } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [settings, setSettings] = useState(false);
  const [sceneEpoch, setSceneEpoch] = useState(0);
  const [notebook, setNotebook] = useState(false);
  const [speed, setSpeed] = useState(25);
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
  function requestDelete() {
    try {
      const current = loadGame(storage);
      if (gameRef.current) {
        if (
          current.status !== "loaded" ||
          JSON.stringify(current.state) !== JSON.stringify(gameRef.current)
        ) {
          setSettings(false);
          setNotice(
            "別の画面でセーブが更新されています。再読み込みしてからやり直してください。",
          );
          return;
        }
      } else if (
        loaded.status !== "invalid" ||
        current.status !== "invalid" ||
        current.raw === null ||
        current.raw !== loaded.raw
      ) {
        setNotice(
          "保存データを確認できません。再読み込みしてからやり直してください。",
        );
        return;
      }
      const snapshot = {
        game: storage.getItem(SAVE_KEY),
        learning: storage.getItem(LEARNING_KEY),
      };
      setSettings(false);
      setDeleteSnapshot(snapshot);
    } catch {
      setNotice(
        "保存データを読み取れませんでした。ブラウザの保存設定を確認してください。",
      );
    }
  }
  function save() {
    if (!gameRef.current) return;
    const saved = saveGame(storage, gameRef.current, gameRef.current);
    setNotice(saved.ok ? "現在の場面を保存しました。" : saved.message);
  }
  function reload() {
    const restored = loadGame(storage);
    if (restored.status === "loaded") {
      adopt(restored.state);
      setConfirmation(null);
      setResult(false);
      setSceneEpoch((epoch) => epoch + 1);
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
  const conversationActive = !!(
    active ||
    game?.activeEpilogue ||
    game?.activeTourism?.phase === "guide" ||
    (!game?.activeTourism && game?.activeBattle?.phase === "dialogue")
  );
  const mobilePlayActive = !!(
    conversationActive || (!game?.activeTourism && game?.activeBattle)
  );
  const mobileObservationActive = game?.activeTourism?.phase === "exploring";
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
    <div
      className={`app-shell${displaySettings.value.reduceMotion ? " reduce-motion" : ""}${conversationActive ? " conversation-active" : ""}${mobilePlayActive ? " mobile-play-active" : ""}${mobileObservationActive ? " mobile-observation-active" : ""}`}
    >
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
                  <button
                    className="secondary"
                    type="button"
                    onClick={requestDelete}
                  >
                    保存データを消去する
                  </button>
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
            reduceMotion={displaySettings.value.reduceMotion}
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
              }
            }}
          />
        ) : !freeTimeAvailable ? (
          <EpisodeScreen
            game={game}
            onStart={(id) => commit((state) => startEpisode(state, id))}
          />
        ) : active && frame ? (
          <RomanceScene
            key={`${active.dateId}-${sceneEpoch}`}
            game={game}
            date={currentDate}
            speed={speed}
            onSpeed={setSpeed}
            confirmChoices={displaySettings.value.confirmChoices}
            reduceMotion={displaySettings.value.reduceMotion}
            onSelect={(index, text, revision) => {
              if (displaySettings.value.confirmChoices) {
                setConfirmation({ kind: "choice", index, text, revision });
                return true;
              }
              return commit((state) => chooseDate(state, index, revision));
            }}
            onAdvance={() => {
              commit((state) => advanceDate(state, game.revision));
            }}
            onFinish={() => {
              if (commit((state) => finishDate(state, game.revision)))
                setResult(true);
            }}
          />
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
                }
              }}
            />
            <BattleEntry
              game={game}
              onStart={(id) => {
                if (commit((state) => startBattle(state, id))) {
                  setResult(false);
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
      {deleteSnapshot && (
        <Modal
          labelledBy="delete-title"
          onClose={() => setDeleteSnapshot(null)}
        >
          <h2 id="delete-title">保存データを消去しますか？</h2>
          <p>
            このブラウザに保存された名前、旅の進行、AP、恋愛・バトルの記録、英語ノートと対訳設定を消去します。元には戻せません。
          </p>
          <p className="fine-print">
            以前に退避したバックアップと、ほかのサイトのデータは消去しません。ほかの端末やブラウザにも影響しません。
          </p>
          <button
            className="secondary"
            autoFocus
            onClick={() => setDeleteSnapshot(null)}
          >
            消去せず戻る
          </button>
          <button
            className="danger-button"
            onClick={() => {
              const result = deleteSaveData(storage, deleteSnapshot);
              if (!result.ok) {
                setDeleteSnapshot(null);
                setNotice(result.message);
                return;
              }
              window.location.reload();
            }}
          >
            保存データを消去する
          </button>
        </Modal>
      )}
      {settings && game && (
        <Modal labelledBy="settings-title" onClose={() => setSettings(false)}>
          <h2 id="settings-title">設定</h2>
          <label className="translation-setting">
            <input
              type="checkbox"
              checked={displaySettings.value.confirmChoices}
              disabled={!!displaySettings.error}
              onChange={(event) =>
                displaySettings.update({ confirmChoices: event.target.checked })
              }
            />{" "}
            選択肢を選ぶ前に確認する
          </label>
          <label className="translation-setting">
            <input
              type="checkbox"
              checked={displaySettings.value.reduceMotion}
              disabled={!!displaySettings.error}
              onChange={(event) =>
                displaySettings.update({ reduceMotion: event.target.checked })
              }
            />{" "}
            演出を短縮する
          </label>
          {displaySettings.error && (
            <p role="status">{displaySettings.error}</p>
          )}
          <label className="translation-setting">
            <input
              type="checkbox"
              checked={learning.data.alwaysTranslate}
              disabled={!!learning.error}
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
          {learning.error && <p role="status">{learning.error}</p>}
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
          <button className="text-button delete-entry" onClick={requestDelete}>
            保存データの消去
          </button>
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
