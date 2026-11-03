import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  balance,
  dates,
  dateDestinations,
  presentation,
  landmarks,
  tourismAssets,
  city,
  getCityContent,
  battles,
  episodes,
  journeyConfig,
} from "../content";
import { getJourney, getJourneyForCity } from "../content/journeys";
import { currencyForCity, formatMoneyForCity } from "../content/currency";
import { journeyStorage } from "../persistence/journey-storage";
import { useJourneyLock } from "../persistence/useJourneyLock";
import { loadJourneyDraft, promoteJourneyDraft } from "../persistence/journey-preparation";
import { PreparingJourney } from "../features/journey/PreparingJourney";
import { UnavailableJourney } from "../features/journey/UnavailableJourney";
import { JourneySelection } from "../features/journey/JourneySelection";
import { beginTravelEvent, finishTravelEventIfComplete, sleepAtHotel, waitForTravel } from "../domain/travel-game";
import { getGameWeekday } from "../domain/travel";
import { getNextCity, departToNextCity, advanceCompletedIndiaCity } from "../domain/city-travel";
import {
  advanceDate,
  chooseDate,
  createGame,
  finishDate,
  claimTrialMilestone,
  setNames,
  startDate,
  isUpdatedDateReplay,
  type GameState,
} from "../domain/game";
import {
  backupAndCreate,
  deleteSaveData,
  LEARNING_KEY,
  SAVE_KEY,
  loadGame,
  sameGameState,
  saveGame,
} from "../persistence";
import { CanalScene } from "../components/CanalScene";
import { HeldItems } from "../components/HeldItems";
import { secureRomanceRoll } from "../random/romance-source";
import { usePresentationSettings } from "../components/usePresentationSettings";
import { RomanceScene } from "../features/romance/RomanceScene";
import { Modal } from "../components/Modal";
import { withNames } from "../features/romance/RomanceMenu";
import { BattleScreen } from "../features/battle/BattleScreen";
import { TourismScreen } from "../features/tourism/TourismScreen";
import { ClueNotebook } from "../features/tourism/ClueNotebook";
import { useLearning } from "../features/learning/useLearning";
import { EnglishReview } from "../features/learning/EnglishReview";
import { FreeTimeHub } from "../features/journey/FreeTimeHub";
import { CityProgressBadge, CityRecords } from "../features/journey/CityProgress";
import { TravelActions } from "../features/journey/TravelActions";
import { EncounterScreen } from "../features/journey/EncounterScreen";
import { encounters } from "../content/encounters";
import { advanceEncounter, chooseEncounter, answerEncounterQuiz, finishEncounter, getEncounterOptionAvailability, getEncounterQuizFeedback, getActiveEncounterDefinition, encounterChoiceOption, encounterStoryCanFinish, proceedFromTourism, continueTourismEncounters } from "../domain/encounter";
import { EpilogueScreen } from "../features/journey/EpilogueScreen";
import { startCityEpilogue, advanceCityEpilogue } from "../domain/epilogue";
import {
  getCurrentEpisode,
  getNextEpisode,
  getNextStoryBattle,
  startEpisode,
  enterFreeTime,
} from "../domain/chapter";
import { claimPendingRewards } from "../domain/rewards";
import "../features/journey/journey.css";
import {
  openTourism,
  advanceTourismGuide,
  skipTourismGuide,
  discoverClue,
  replayTourismGuide,
} from "../domain/tourism";
import {
  startBattle,
  advanceBattle,
  answerBattle,
  toggleBattleHint,
  getReasoningContext,
  getActiveBattleContent,
  selectReasoningClue,
  pressBattleClaim,
  submitBattleEvidence,
  leaveBattle,
} from "../domain/battle";

const browserStorage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) =>
    window.localStorage.setItem(key, value),
  removeItem: (key: string) => window.localStorage.removeItem(key),
};
type Confirmation = { kind: "date"; id: string };

type AppProps = {
  storage?: typeof browserStorage;
  nextRomanceRoll?: () => number;
  debug?: boolean;
};

export default function App(props: AppProps = {}) {
  const [journeyId, setJourneyId] = useState("milano");
  const baseStorage = props.storage ?? browserStorage;
  const scopedStorage = useMemo(() => journeyStorage(baseStorage, journeyId), [baseStorage, journeyId]);
  const [lockAttempt, setLockAttempt] = useState(0);
  const journey = getJourney(journeyId);
  const readOnlyPreparation = journey?.status === "preparing" && journey.id !== "golden_triangle";
  // A read-only preparation has no save to edit, so it needs no storage lock.
  const lockStatus = useJourneyLock(props.debug || readOnlyPreparation ? "milano" : journeyId, scopedStorage, lockAttempt);
  // Debug supplies an isolated, pre-populated game; do not alter its storage.
  if (props.debug) return <GameApp {...props} />;
  if (lockStatus !== "ready") return <div className="app-shell"><main id="main"><section className="paper intro">
    <JourneySelection value={journeyId} onChange={setJourneyId} />
    <p role={lockStatus === "loading" ? "status" : "alert"}>{lockStatus === "loading"
      ? "保存データを確認しています。"
      : lockStatus === "busy" ? "この旅行編は別のタブで開いています。そちらを閉じてから再試行してください。"
      : "このブラウザでは別タブとの保存競合を防げないため、この旅行編を開けません。対応ブラウザをご利用ください。"}</p>
    {lockStatus === "busy" && <button type="button" className="secondary" onClick={() => setLockAttempt((value) => value + 1)}>再試行</button>}
  </section></main></div>;
  if (journey?.status === "preparing") {
    return journey.id === "golden_triangle"
      ? <PreparingJourney key={journeyId} storage={scopedStorage} onSwitchJourney={setJourneyId} />
      : <UnavailableJourney journey={journey} onSwitchJourney={setJourneyId} />;
  }
  if (journeyId === "golden_triangle") return <PlayableJourney key={journeyId} {...props} storage={scopedStorage} journeyId={journeyId} onSwitchJourney={setJourneyId} />;
  return <GameApp key={journeyId} {...props} storage={scopedStorage} journeyId={journeyId} onSwitchJourney={setJourneyId} />;
}

function PlayableJourney(props: AppProps & { storage: typeof browserStorage; journeyId: string; onSwitchJourney: (id: string) => void }) {
  const [status, setStatus] = useState<"loading" | "ready" | string>("loading");
  useEffect(() => {
    const draft = loadJourneyDraft(props.storage);
    if (draft.status !== "loaded") { setStatus("ready"); return; }
    const result = promoteJourneyDraft(props.storage, draft.raw);
    setStatus(result.ok ? "ready" : result.message);
  }, [props.storage]);
  if (status === "ready") return <GameApp {...props} />;
  return <div className="app-shell"><main id="main"><section className="paper intro">
    <JourneySelection value={props.journeyId} onChange={props.onSwitchJourney} />
    <p role={status === "loading" ? "status" : "alert"}>{status === "loading" ? "保存データを確認しています。" : status}</p>
  </section></main></div>;
}

function GameApp({
  storage = browserStorage,
  nextRomanceRoll = secureRomanceRoll,
  debug = false,
  journeyId = "milano",
  onSwitchJourney,
}: AppProps & { journeyId?: string; onSwitchJourney?: (id: string) => void }) {
  const isDebug = import.meta.env.DEV && debug;
  const [loaded] = useState(() => loadGame(storage));
  const [game, setGame] = useState<GameState | null>(
    loaded.status === "loaded" ? loaded.state : null,
  );
  const learning = useLearning(game, storage, !isDebug);
  const displaySettings = usePresentationSettings(storage);
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
  // The last snapshot read or written by this tab remains the comparison point
  // while manual-save mode advances only the in-memory game.
  const savedGameRef = useRef<GameState | null>(loaded.status === "loaded" ? loaded.state : null);
  // When the user explicitly starts over in manual mode, keep the unreadable
  // original in place until an explicit save can back it up safely.
  const protectedOriginalRef = useRef<string | null>(null);
  const [invalid, setInvalid] = useState(
    loaded.status === "invalid" ? loaded.message : "",
  );
  const [notice, setNotice] = useState("");
  const [deleteSnapshot, setDeleteSnapshot] = useState<{
    game: string | null;
    learning: string | null;
  } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [confirmDeparture, setConfirmDeparture] = useState(false);
  const [settings, setSettings] = useState(false);
  const [switchJourneyTo, setSwitchJourneyTo] = useState<string | null>(null);
  function requestJourneySwitch(id: string) {
    if (id === journeyId || !onSwitchJourney) return;
    if (gameRef.current && (!savedGameRef.current || !sameGameState(gameRef.current, savedGameRef.current))) {
      setSettings(false);
      setSwitchJourneyTo(id);
      return;
    }
    onSwitchJourney(id);
  }
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [sceneEpoch, setSceneEpoch] = useState(0);
  const [notebook, setNotebook] = useState(false);
  const speed = displaySettings.value.dialogueSpeed;
  const setSpeed = (next: number) => displaySettings.update({ dialogueSpeed: next });
  const [confirmLoad, setConfirmLoad] = useState(false);
  const [showRomanceEnding, setShowRomanceEnding] = useState(false);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(null);
  const [placeFocusRequest, setPlaceFocusRequest] = useState(0);
  const [player, setPlayer] = useState(
    game?.playerName ?? balance.defaultPlayerName,
  );
  const [heroine, setHeroine] = useState(
    game?.heroineName ?? balance.defaultHeroineName,
  );

  useEffect(() => {
    const warnIfUnsaved = (event: BeforeUnloadEvent) => {
      if (!gameRef.current || displaySettings.value.autoSave ||
          (savedGameRef.current && sameGameState(gameRef.current, savedGameRef.current))) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnIfUnsaved);
    return () => window.removeEventListener("beforeunload", warnIfUnsaved);
  }, [displaySettings.value.autoSave]);

  function adopt(next: GameState) {
    gameRef.current = next;
    setGame(next);
  }
  function returnToPlace(landmarkId: string | null | undefined) {
    setSelectedLandmarkId(landmarkId ?? null);
    if (landmarkId) setPlaceFocusRequest((value) => value + 1);
  }
  function commit(change: (state: GameState) => GameState) {
    if (!gameRef.current) return false;
    const previous = gameRef.current;
    const changed = finishTravelEventIfComplete(previous, change(previous));
    if (changed === previous) return false;
    // Settle the current action and any India city transition as one snapshot.
    const next = advanceCompletedIndiaCity(changed, changed.revision);
    if (displaySettings.value.autoSave) {
      const saved = saveGame(storage, next, savedGameRef.current);
      if (!saved.ok) {
        setNotice(saved.message);
        return false;
      }
      savedGameRef.current = next;
    }
    adopt(next);
    if (next.currentCityId !== previous.currentCityId) setSelectedLandmarkId(null);
    setNotice("");
    return true;
  }
  // A previously completed city can gain a published successor later. On
  // resume, use the same guarded save path as any other game action.
  useEffect(() => {
    if (!game) return;
    commit((state) => advanceCompletedIndiaCity(state, state.revision));
  }, [game]);
  function begin(event: FormEvent) {
    event.preventDefault();
    if (loaded.status === "invalid" && loaded.kind === "journey") return;
    const next = createGame(player.trim(), heroine.trim(), { journeyId });
    const unsavedStart = !displaySettings.value.autoSave &&
      (loaded.status === "empty" || (loaded.status === "invalid" && loaded.raw !== null));
    const saved = unsavedStart ? { ok: true as const } : invalid && loaded.status === "invalid"
      ? backupAndCreate(storage, next, loaded.raw)
      : saveGame(storage, next);
    if (!saved.ok) {
      setNotice(saved.message);
      return;
    }
    savedGameRef.current = unsavedStart ? null : next;
    protectedOriginalRef.current = unsavedStart && loaded.status === "invalid" ? loaded.raw : null;
    adopt(next);
    setInvalid("");
    setNotice("");
  }
  function requestDelete() {
    try {
      const current = loadGame(storage);
      if (gameRef.current) {
        if (
          savedGameRef.current === null
            ? protectedOriginalRef.current === null
              ? current.status !== "empty"
              : current.status !== "invalid" || current.raw !== protectedOriginalRef.current
            : current.status !== "loaded" || !sameGameState(current.state, savedGameRef.current)
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
    const saved = protectedOriginalRef.current !== null
      ? backupAndCreate(storage, gameRef.current, protectedOriginalRef.current)
      : saveGame(storage, gameRef.current, savedGameRef.current);
    if (saved.ok) { savedGameRef.current = gameRef.current; protectedOriginalRef.current = null; }
    setNotice(saved.ok ? "現在の場面を保存しました。" : saved.message);
  }
  function reload() {
    if (gameRef.current && (savedGameRef.current === null || !sameGameState(gameRef.current, savedGameRef.current))) {
      setConfirmLoad(true);
      return;
    }
    loadSavedGame();
  }
  function loadSavedGame() {
    const restored = loadGame(storage);
    if (restored.status === "loaded") {
      savedGameRef.current = restored.state;
      protectedOriginalRef.current = null;
      adopt(restored.state);
      setConfirmation(null);
      setShowRomanceEnding(false);
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
  function setAutoSave(enabled: boolean) {
    if (enabled && gameRef.current) {
      const result = protectedOriginalRef.current !== null
        ? backupAndCreate(storage, gameRef.current, protectedOriginalRef.current)
        : saveGame(storage, gameRef.current, savedGameRef.current);
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      savedGameRef.current = gameRef.current;
      protectedOriginalRef.current = null;
    }
    if (displaySettings.update({ autoSave: enabled })) setNotice("");
  }
  const active = game?.activeDate;
  const conversationActive = !!(
    active ||
    game?.activeEncounter ||
    game?.activeEpilogue ||
    game?.activeTourism?.phase === "guide" ||
    (!game?.activeTourism && game?.activeBattle?.phase === "dialogue")
  );
  const mobilePlayActive = !!(
    conversationActive || (!game?.activeTourism && game?.activeBattle)
  );
  const mobileObservationActive = game?.activeTourism?.phase === "exploring";
  const freeTimeAvailable = !!game;
  const idle =
    game &&
    !game.activeDate &&
    !game.activeEncounter &&
    !game.activeBattle &&
    !game.activeTourism &&
    !game.activeEpilogue;
  const nextEpisode = game ? getNextEpisode(game) : null;
  const nextStoryBattle = game ? getNextStoryBattle(game) : null;
  const frame = active?.frame;
  useEffect(() => {
    if (active?.dateId || showRomanceEnding)
      document.getElementById("main")?.scrollIntoView({ block: "start" });
  }, [active?.dateId, showRomanceEnding]);
  const currentDate = dates.find((date) => date.id === active?.dateId);
  const activeEncounter = game?.activeEncounter;
  const currentEncounter = activeEncounter ? getActiveEncounterDefinition(activeEncounter) : undefined;
  const encounterLandmark = landmarks.find((landmark) => landmark.id === currentEncounter?.landmarkId);
  const encounterImage = tourismAssets.find((asset) => asset.id === encounterLandmark?.imageAssetId);
  const encounterFeedback = game ? getEncounterQuizFeedback(game) : null;
  const activeBattleContent = game?.activeBattle ? getActiveBattleContent(game.activeBattle) : undefined;
  const currentBattle = activeBattleContent?.battle;
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
  const selectedUpdatedDate = !!game && !!selectedDate && isUpdatedDateReplay(game, selectedDate.id);
  const selectedDestination = dateDestinations.find(
    (destination) => destination.id === selectedDate?.destinationId,
  );
  const currentCity = game ? getCityContent(game.currentCityId) : undefined;
  const currentTravelPlace = game
    ? currentCity!.travel.places.find((place) => place.id === game.travel.currentPlaceId)
    : undefined;
  const weekday = getGameWeekday(game?.travel.calendar);
  const nextCity = game ? getNextCity(game) : undefined;
  const automaticIndiaJourney = !!game && getJourneyForCity(game.currentCityId)?.id === "golden_triangle";
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
      className={`app-shell${displaySettings.value.reduceMotion ? " reduce-motion" : ""}${conversationActive ? " conversation-active" : ""}${mobilePlayActive ? " mobile-play-active" : ""}${mobileObservationActive ? " mobile-observation-active" : ""}${idle && freeTimeAvailable && !showRomanceEnding ? " free-time-active" : ""}`}
    >
      <header className="masthead">
        <a href="#main" className="brand">
          Dreamscape<span>旅の余白</span>
        </a>
        <span className="edition">{currentCity?.city.nameJa ?? city.nameJa}の旅</span>
      </header>
      {game && (
        <div className="journey-bar">
          <span className="travelers">
            {game.playerName}
            <span className="amp"> と </span>
            {game.heroineName}
          </span>
          <div className="journey-context" data-testid="journey-context">
            <span>現在地：{game.travel.currentPlaceId === game.travel.hotelPlaceId ? `滞在先${currentTravelPlace?.nameJa.includes("架空") ? "（架空）" : ""}` : currentTravelPlace?.nameJa ?? "不明"}</span>
            <strong>{game.travel.day}日目{weekday === undefined ? null : <span aria-label={`ゲーム内の${["月", "火", "水", "木", "金", "土", "日"][weekday]}曜日`}>（{["月", "火", "水", "木", "金", "土", "日"][weekday]}）</span>} {String(Math.floor(game.travel.minute / 60)).padStart(2, "0")}:{String(game.travel.minute % 60).padStart(2, "0")}</strong>
          </div>
          <div className="journey-resources">
            <span className="travel-budget" aria-label={`旅の予算 ${game.travelBudget}${currencyForCity(game.currentCityId).unitJa}`}>{formatMoneyForCity(game.currentCityId, game.travelBudget)}</span>
            <span className="ap" aria-label={`残り${game.ap}AP`}>
              {game.ap}
              <small> AP</small>
            </span>
            <HeldItems items={encounters.items.filter((item) => item.cityId === game.currentCityId && game.inventory[item.id] === "held").map((item) => ({ id: item.id, name: item.nameJa, description: item.descriptionJa }))} />
          </div>
          <div className="journey-controls" data-testid="city-progress">
            <button className="journey-progress-button" type="button" aria-label="観光地・発見・戦績を見る" onClick={() => setRecordsOpen(true)}><CityProgressBadge game={game} /></button>
            {game.endingReached && <span className="city-relationship">交際中</span>}
            {idle && !showRomanceEnding && <TravelActions game={game} reduceMotion={displaySettings.value.reduceMotion}
              onTravelWait={(minutes) => commit((state) => waitForTravel(state, minutes, game.revision))}
              onTravelSleep={(mode, viaPlaceId) => commit((state) => sleepAtHotel(state, mode, game.revision, viaPlaceId))} />}
          </div>
          <nav className="journey-quick-actions" aria-label="旅の操作">
            <button type="button" aria-label="英語ノートを開く" onClick={() => openEnglish()}>英語</button>
            <button type="button" onClick={save}>セーブ</button>
            <button type="button" onClick={reload}>ロード</button>
            <button type="button" onClick={() => {
              setPlayer(game.playerName);
              setHeroine(game.heroineName);
              setSettings(true);
            }}>設定</button>
          </nav>
        </div>
      )}
      {game && (
        <div className="journey-stage" aria-label="旅の進行">
          <span>
            {reasoningRule
              ? `${landmarks.find((item) => item.id === currentLandmarkId)?.nameJa} · 特別対決`
              : idle && nextStoryBattle
                ? nextStoryBattle.titleJa
              : game.completedCityIds.includes(game.currentCityId) &&
                  !game.activeBattle &&
                  !game.activeTourism &&
                  !game.activeEpilogue
                ? `${currentCity!.city.nameJa} · 都市クリア`
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
                  <strong>{loaded.status === "invalid" && loaded.kind === "newer"
                    ? "新しいバージョンの保存データです"
                    : "保存データを読み込めませんでした"}</strong>
                  <p>{invalid}</p>
                  {loaded.status === "invalid" && loaded.kind === "journey" ? <p>
                    旅行編を切り替え、元の編のデータを確認してください。
                  </p> : loaded.status === "invalid" && loaded.raw !== null && <p>
                    {displaySettings.value.autoSave
                      ? "元のデータは残っています。バックアップを保存してから新しく始めるか、保存データの消去を選べます。"
                      : "元のデータは残っています。新しく始めた場合、手動セーブ時に元のデータをバックアップします。"}
                  </p>}
                  {!(loaded.status === "invalid" && loaded.kind === "journey") && <button
                    className="secondary"
                    type="button"
                    onClick={requestDelete}
                    disabled={loaded.status === "invalid" && loaded.raw === null}
                  >
                    保存データを消去する
                  </button>}
                </div>
              )}
              {!isDebug && onSwitchJourney && <JourneySelection value={journeyId} onChange={requestJourneySwitch} />}
              {!(loaded.status === "invalid" && loaded.kind === "journey") && <form onSubmit={begin} className="name-form">
                {nameForm}
                <button
                  className="primary"
                  disabled={!player.trim() || !heroine.trim() || (loaded.status === "invalid" && (loaded.raw === null || loaded.kind === "journey"))}
                >
                  {invalid
                    ? displaySettings.value.autoSave ? "元のデータを退避して新しく始める" : "元のデータを残して新しく始める"
                    : "旅をはじめる"}
                  <span aria-hidden="true"> →</span>
                </button>
              </form>}
              <p className="fine-print">
                {displaySettings.value.autoSave ? "このブラウザに進行を自動保存します。" : "進行は手動でセーブできます。"}
                <br />
                名前はあとから設定で変更できます。
              </p>
            </section>
          </>
        ) : activeEncounter && currentEncounter ? (
          <EncounterScreen
            autoAdvanceEnabled={displaySettings.value.autoAdvance}
            key={`${activeEncounter.runId}-${sceneEpoch}`}
            learning={learning}
            speed={speed}
            reduceMotion={displaySettings.value.reduceMotion}
            onSpeed={setSpeed}
            view={{
              id: `${currentEncounter.id}_${activeEncounter.phase}`,
              revision: game.revision,
              sceneId: currentEncounter.id,
              cityId: currentEncounter.cityId,
              portraits: (() => {
                const frame = activeEncounter.frame;
                const heroine = frame.reactions?.heroine;
                const enemy = frame.reactions?.enemy;
                const hasEmotion = frame.emotion !== "neutral" || frame.emotionExplicit;
                const heroineSpeaking = frame.speaker === "heroine" || frame.speaker === "narrator";
                const showHeroine = heroine || (hasEmotion && heroineSpeaking);
                const showEnemy = enemy || (hasEmotion && frame.speaker === "enemy");
                if (!showHeroine && !showEnemy) return undefined;
                return {
                  ...(showHeroine ? { heroine: { emotion: heroine?.expression ?? (heroineSpeaking ? frame.emotion : "neutral"), mark: heroine?.mark, active: frame.speaker === "heroine" } } : {}),
                  ...(showEnemy ? { enemy: { emotion: enemy?.expression ?? (frame.speaker === "enemy" ? frame.emotion : "neutral"), mark: enemy?.mark, active: frame.speaker === "enemy" } } : {}),
                };
              })(),
              background: activeEncounter.frame.background,
              backgroundImage: encounterImage?.path,
              speaker: activeEncounter.frame.speaker === "heroine" ? game.heroineName : activeEncounter.frame.speaker === "player" ? game.playerName : "旅の風景",
              text: activeEncounter.frame.text,
              choices: activeEncounter.frame.choices.map((choice) => {
                const option = encounterChoiceOption(currentEncounter, choice);
                const availability = getEncounterOptionAvailability(game, choice.index);
                return { index: choice.index, textEn: choice.text, translationJa: choice.translationJa ?? option?.translationJa ?? "", cost: option?.cost ?? option?.costEuro, unavailableReason: availability.available ? undefined : availability.reason };
              }),
              ended: activeEncounter.frame.ended && (activeEncounter.phase === "outcome" || encounterStoryCanFinish(game)),
              finishLabel: activeEncounter.returnTourism ? "観光に戻る" : undefined,
              quiz: (activeEncounter.phase === "quiz" || activeEncounter.phase === "feedback") && currentEncounter.quiz ? {
                id: currentEncounter.quiz.question.id,
                questionEn: currentEncounter.quiz.question.questionEn,
                questionJa: currentEncounter.quiz.translations.questionJa,
                options: currentEncounter.quiz.question.options.map((option, index) => ({ index, textEn: option.textEn, translationJa: currentEncounter.quiz!.translations.options[option.id] })),
                result: encounterFeedback ? `${encounterFeedback.correct ? "正解" : "不正解"}。${encounterFeedback.explanationJa}` : undefined,
              } : undefined,
            }}
            onChoose={(index) => {
              const changed = commit((state) => chooseEncounter(state, index, game.revision));
              if (changed && !gameRef.current?.activeEncounter && !gameRef.current?.activeTourism)
                returnToPlace(currentEncounter.landmarkId);
              return changed;
            }}
            onAnswer={(index) => commit((state) => answerEncounterQuiz(state, currentEncounter.quiz!.question.options[index].id, game.revision))}
            onAdvance={() => {
              if (commit((state) => continueTourismEncounters(state, advanceEncounter(state, game.revision), nextRomanceRoll)) && !gameRef.current?.activeEncounter && !gameRef.current?.activeTourism)
                returnToPlace(currentEncounter.landmarkId);
            }}
            onFinish={() => {
              if (commit((state) => continueTourismEncounters(state, finishEncounter(state, game.revision), nextRomanceRoll)) && !gameRef.current?.activeEncounter && !gameRef.current?.activeTourism)
                returnToPlace(currentEncounter.landmarkId);
            }}
          />
        ) : game.activeEpilogue ? (
          <EpilogueScreen
            autoAdvanceEnabled={displaySettings.value.autoAdvance}
            game={game}
            speed={speed}
            reduceMotion={displaySettings.value.reduceMotion}
            onSpeed={setSpeed}
            onAdvance={() =>
              commit((state) => advanceCityEpilogue(state, game.revision))
            }
          />
        ) : game.activeTourism ? (
          <TourismScreen
            autoAdvanceEnabled={displaySettings.value.autoAdvance}
            key={game.activeTourism.landmarkId}
            game={game}
            speed={speed}
            reduceMotion={displaySettings.value.reduceMotion}
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
              commit((state) => proceedFromTourism(state, game.revision, nextRomanceRoll))
            }
          />
        ) : game.activeBattle ? (
          <BattleScreen
            autoAdvanceEnabled={displaySettings.value.autoAdvance}
            key={`${game.activeBattle.runId}-${sceneEpoch}`}
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
            onNextEpisode={undefined}
            nextIsFinale={nextEpisode?.kind === "city_finale"}
            nextStoryBattle={nextStoryBattle ?? undefined}
            onNextStoryBattle={undefined}
            onEpilogue={
              !nextStoryBattle && cityNotebook &&
              game.completedCityIds.includes(currentBattle.cityId!) &&
              !game.viewedEpilogueCityIds.includes(currentBattle.cityId!)
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
              if (commit((state) =>
                reasoningRule
                  ? leaveBattle(state, game.revision)
                  : enterFreeTime(state, game.revision),
              )) returnToPlace(currentBattle?.landmarkId);
            }}
          />
        ) : active && frame ? (
          <RomanceScene
            autoAdvanceEnabled={displaySettings.value.autoAdvance}
            key={`${active.dateId}-${sceneEpoch}`}
            game={game}
            date={currentDate}
            speed={speed}
            onSpeed={setSpeed}
            reduceMotion={displaySettings.value.reduceMotion}
            onSelect={(index, revision) =>
              commit((state) => chooseDate(state, index, revision))
            }
            onAdvance={() => {
              commit((state) => advanceDate(state, game.revision));
            }}
            onFinish={() => {
              const hadEnding = game.endingReached;
              if (commit((state) => finishDate(state, game.revision))) {
                if (!hadEnding && gameRef.current?.endingReached)
                  setShowRomanceEnding(true);
                document.getElementById("main")?.scrollIntoView({ block: "start" });
              }
            }}
          />
        ) : game.endingReached && showRomanceEnding ? (
          <>
            <CanalScene backgroundId={currentTravelPlace?.backgroundAssetId} />
            <section className="paper ending" data-testid="romance-ending">
              <p className="eyebrow">交際開始</p>
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
                これからも、旅先でふたりの時間を過ごせます。
              </p>
              <button className="primary" onClick={() => setShowRomanceEnding(false)}>
                自由時間へ <span aria-hidden="true">→</span>
              </button>
            </section>
          </>
        ) : (
          <FreeTimeHub
            game={game}
            selectedLandmarkId={selectedLandmarkId}
            onSelectLandmark={setSelectedLandmarkId}
            placeFocusRequest={placeFocusRequest}
            onClaimRewards={() => commit((state) => claimPendingRewards(state, game.revision))}
            onStartEpisode={(id) => commit((state) => startEpisode(state, id))}
            onEpilogue={(id) => commit((state) => startCityEpilogue(state, id, game.revision))}
            onChooseDate={(id) => setConfirmation({ kind: "date", id })}
            onMilestone={(id) => commit((state) => claimTrialMilestone(state, id))}
            onTourism={(id) => commit((state) => {
              const episode = episodes.find((item) => item.landmarkId === id);
              const storyBattle = journeyConfig.storyBattles.find((entry) => battles.find((battle) => battle.id === entry.battleId)?.landmarkId === id);
              const eventId = episode?.id ?? storyBattle?.battleId;
              return eventId ? beginTravelEvent(state, eventId, "walk", game.revision, nextRomanceRoll) : state;
            })}
            onBattle={(id) => commit((state) => startBattle(state, id))}
            onTravelEvent={(id, mode) => commit((state) => beginTravelEvent(state, id, mode, game.revision, nextRomanceRoll))}
            nextCityName={automaticIndiaJourney ? undefined : nextCity?.city.nameJa}
            onDepart={() => setConfirmDeparture(true)}
          />
        )}
      </main>
      <footer>
        Dreamscape <span>·</span> 旅の余白に、ふたりの物語。
      </footer>
      {confirmDeparture && game && nextCity && !automaticIndiaJourney && <Modal labelledBy="departure-title" onClose={() => setConfirmDeparture(false)}>
        <h2 id="departure-title">{nextCity.city.nameJa}へ出発</h2>
        <p>次の街へ進みます。今の街の未使用アイテムは持って行けません。</p>
        <button type="button" className="primary" onClick={() => {
          if (commit((state) => departToNextCity(state, game.revision))) setConfirmDeparture(false);
        }}>出発する</button>
        <button type="button" className="secondary" onClick={() => setConfirmDeparture(false)}>この街に残る</button>
      </Modal>}
      {recordsOpen && game && <Modal labelledBy="city-records-title" onClose={() => setRecordsOpen(false)}>
        <div className="records-heading"><h2 id="city-records-title">旅の記録</h2><button type="button" className="secondary" onClick={() => setRecordsOpen(false)}>閉じる</button></div>
        <CityRecords game={game} />
      </Modal>}
      {notebook && game && (canObserve || cityNotebook) && (
        <ClueNotebook
          landmarkId={currentLandmarkId ?? undefined}
          cityId={cityNotebook ? currentBattle.cityId : undefined}
          discoveredIds={game.discoveredClueIds}
          onDiscoverDocument={game.activeTourism?.phase === "exploring" ? (id) => commit((state) => discoverClue(state, id, game.revision)) : undefined}
          onClose={() => setNotebook(false)}
          reasoning={
            reasoningRule &&
            currentBattle &&
            game.activeBattle &&
            reasoningContext &&
            !game.activeTourism
              ? {
                  caseClueIds: reasoningRule.caseClueIds,
                  clues: activeBattleContent!.clues,
                  claimText: reasoningContext.claimText,
                  questionEn:
                    activeBattleContent!.quiz.questions[
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
          <p className="eyebrow">デートのお誘い</p>
          <h2 id="confirm-title">
            {selectedDestination
              ? `${selectedDestination.nameJa}のデートを始めますか？`
              : `${selectedDate?.titleJa}を始めますか？`}
          </h2>
          <p className="confirm-text">
            {selectedUpdatedDate
              ? "APを使わず、新しくなった会話を一度楽しめます。"
              : selectedDate?.apCost
              ? `${selectedDate.apCost}APを使って、デートを始めます。`
              : "APは使いません。ふたりの時間を始めます。"}
          </p>
          <button
            autoFocus
            className="primary"
            onClick={() => {
              const selected = confirmation;
              setConfirmation(null);
              commit((state) => startDate(state, selected.id, nextRomanceRoll));
            }}
          >
            {!selectedUpdatedDate && selectedDate?.apCost ? "APを使って始める" : "この時間を過ごす"}
          </button>
          <button className="secondary" onClick={() => setConfirmation(null)}>
            選び直す
          </button>
        </Modal>
      )}
      {confirmLoad && (
        <Modal labelledBy="load-title" onClose={() => setConfirmLoad(false)}>
          <h2 id="load-title">保存した場面を読み込みますか？</h2>
          <p>まだ保存していない進行は失われます。</p>
          <button className="secondary" autoFocus onClick={() => setConfirmLoad(false)}>戻る</button>
          <button className="primary" onClick={() => { setConfirmLoad(false); loadSavedGame(); }}>ロードする</button>
        </Modal>
      )}
      {deleteSnapshot && (
        <Modal
          labelledBy="delete-title"
          onClose={() => setDeleteSnapshot(null)}
        >
          <h2 id="delete-title">{isDebug ? "Debug用の一時データを消去しますか？" : "保存データを消去しますか？"}</h2>
          {isDebug ? <p>Debug用の進行と英語ノートを消去して設定画面へ戻ります。通常のセーブ・英語ノート・表示設定は消去しません。</p> : <><p>
            このブラウザに保存された名前、旅の進行、AP、恋愛・バトルの記録、英語ノートと対訳設定を消去します。元には戻せません。
          </p>
          <p className="fine-print">
            以前に退避したバックアップと、ほかのサイトのデータは消去しません。ほかの端末やブラウザにも影響しません。
          </p></>}
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
              // Explicit deletion already confirms that unsaved progress is discarded.
              gameRef.current = null;
              window.location.reload();
            }}
          >
            {isDebug ? "Debug用の一時データを消去する" : "保存データを消去する"}
          </button>
        </Modal>
      )}
      {switchJourneyTo && (
        <Modal labelledBy="switch-journey-title" onClose={() => setSwitchJourneyTo(null)}>
          <h2 id="switch-journey-title">旅行編を切り替える</h2>
          <p>手動セーブしていない進行は失われます。切り替えますか？</p>
          <button className="primary" onClick={() => onSwitchJourney?.(switchJourneyTo)}>切り替える</button>
          <button className="secondary" autoFocus onClick={() => setSwitchJourneyTo(null)}>戻る</button>
        </Modal>
      )}
      {settings && game && (
        <Modal labelledBy="settings-title" onClose={() => setSettings(false)}>
          <h2 id="settings-title">設定</h2>
          {!isDebug && onSwitchJourney && <JourneySelection value={journeyId} onChange={requestJourneySwitch} />}
          <label className="translation-setting">
            <input type="checkbox" checked={displaySettings.value.autoSave} disabled={!!displaySettings.error}
              onChange={(event) => setAutoSave(event.target.checked)} /> ゲームの進行を自動保存する
          </label>
          {!displaySettings.value.autoSave && <p className="fine-print">オフの間は「セーブ」で進行を保存してください。</p>}
          {notice && <p role="status">{notice}</p>}
          <label className="translation-setting">
            文字送り {" "}
            <select aria-label="文字送り" value={speed} disabled={!!displaySettings.error}
              onChange={(event) => setSpeed(Number(event.target.value))}>
              <option value={45}>ゆっくり</option>
              <option value={25}>ふつう</option>
              <option value={0}>一括表示</option>
            </select>
          </label>
          <label className="translation-setting">
            <input type="checkbox" checked={displaySettings.value.autoAdvance} disabled={!!displaySettings.error}
              onChange={(event) => displaySettings.update({ autoAdvance: event.target.checked })} /> 自動送りする
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
          game.activeEncounter ||
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
            {isDebug ? "Debug用の一時データの消去" : "保存データの消去"}
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
