import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import {
  balance,
  dates,
  presentation,
  landmarks,
  tourismAssets,
  getCityContent,
} from "../content";
import { defaultJourneyId, getJourney } from "../content/journeys";
import { JourneySelection, type SelectorFocus } from "../features/journey/JourneySelection";
import { waitForTravel } from "../domain/travel-game";
import { rentTransport } from "../domain/transport";
import { getTransportMode } from "../content/transport";
import { getPlayerDeparture, departToNextCity } from "../domain/city-travel";
import {
  advanceDate,
  chooseDate,
  finishDate,
  setNames,
} from "../domain/game";
import { useGameSession } from "./useGameSession";
import { leaveStep } from "./unsaved-progress";
import { titleSaveActions } from "./save-recovery";
import type { DeleteSnapshot } from "./save-deletion";
import { OldDataCleanup } from "./OldDataCleanup";
import { oldDataContext, type KeyedStorage } from "../persistence/old-data";
import { CanalScene } from "../components/CanalScene";
import { secureRomanceRoll } from "../random/romance-source";
import { usePresentationSettings } from "../components/usePresentationSettings";
import { RomanceScene } from "../features/romance/RomanceScene";
import { Modal } from "../components/Modal";
import { ConfirmActionButton } from "../components/ConfirmActionButton";
import { withNames } from "../features/romance/names";
import { BattleScreen } from "../features/battle/BattleScreen";
import { TourismScreen } from "../features/tourism/TourismScreen";
import { ClueNotebook } from "../features/tourism/ClueNotebook";
import { useLearning } from "../features/learning/useLearning";
import { EnglishReview } from "../features/learning/EnglishReview";
import { FreeTimeHub } from "../features/journey/FreeTimeHub";
import { CityRecords } from "../features/journey/CityProgress";
import { TitleNameFields } from "../features/journey/TitleNameFields";
import { nameOrDefault } from "../domain/player-names";
import { useTravelEffects } from "./useTravelEffects";
import { JourneyHud } from "./JourneyHud";
import { EncounterScreen } from "../features/journey/EncounterScreen";
import { advanceEncounter, chooseEncounter, answerEncounterQuiz, finishEncounter, getEncounterOptionAvailability, getEncounterQuizFeedback, getActiveEncounterDefinition, encounterChoiceOption, encounterCanFinish, proceedFromTourism, continueTourismEncounters } from "../domain/encounter";
import { EpilogueScreen } from "../features/journey/EpilogueScreen";
import { startCityEpilogue, advanceCityEpilogue, completeArrivalLogo } from "../domain/epilogue";
import {
  getBattleResultExits,
  getCurrentEpisode,
  getNextEpisode,
  getNextStoryBattle,
  leaveBattleResult,
  startEpisode,
} from "../domain/chapter";
import { claimPendingRewards } from "../domain/rewards";
import "../features/journey/journey.css";
import {
  openTourism,
  advanceTourismGuide,
  skipTourismGuide,
  discoverClue,
  getReadableDocumentIds,
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
  canToggleReasoningClue,
  getBattleObservationLandmarkId,
  reasoningEvidenceCount,
} from "../domain/battle";

import { browserStorage, type AppProps } from "./app-storage";
import { storySceneChanged, storySceneOnScreen } from "./story-scene-change";
import { holdTaps } from "../components/tap-hold";
import { useDebugMode } from "./debug-mode";
import { DebugModeSetting } from "./DebugModeSetting";
import { relationshipChange, type RelationshipChange } from "../domain/relationship-change";
import { RelationshipChangeNote } from "../components/RelationshipChangeNote";
import { PAGE_MARGIN_ATTRIBUTE } from "../components/scene-tap";

export function GameApp({
  storage = browserStorage,
  nextRomanceRoll = secureRomanceRoll,
  debug = false,
  journeyId = defaultJourneyId,
  onSwitchJourney,
  selectorFocus,
  oldDataStorage,
}: AppProps & { journeyId?: string; onSwitchJourney?: (id: string) => void; selectorFocus?: SelectorFocus; oldDataStorage?: KeyedStorage }) {
  // Only Debug (src/dev/DebugMode.tsx) passes `debug`, on the dev server and, with Debug mode on, in production.
  const isDebug = debug;
  const displaySettings = usePresentationSettings(storage);
  // This device's Debug-mode switch (journeyStorage passes its key through unscoped).
  const debugMode = useDebugMode(storage);
  // While Debug mode is on (always in a Debug session), a choice's relationship changes show above
  // its story scene until the scene ends or the next change (relationship-change.ts). Never saved
  // or logged. Read through a ref: a caller may hold an older `commit` (travel timers).
  const showChanges = isDebug || debugMode.on;
  const showChangesRef = useRef(showChanges);
  showChangesRef.current = showChanges;
  const [shownChange, setShownChange] = useState<{ scene: string; change: RelationshipChange } | null>(null);
  useEffect(() => { if (!showChanges) setShownChange(null); }, [showChanges]);
  const session = useGameSession(storage, displaySettings.value.autoSave, (previous, next) => {
    if (!showChangesRef.current) return;
    const change = relationshipChange(previous, next);
    // Only inside a story scene: with none on screen, a null key would match the map.
    const scene = storySceneOnScreen(next);
    if (change && scene) setShownChange({ scene, change });
  });
  const { game, loaded, invalid, notice, setNotice, commit, getCurrent, save } = session;
  // The second tap of a double tap that starts or ends a story scene must not press the next
  // screen or read the new scene on (story-scene-change.ts).
  const storyScene = storySceneOnScreen(game);
  const shownStoryScene = useRef(storyScene);
  useLayoutEffect(() => {
    if (storySceneChanged(shownStoryScene.current, storyScene)) holdTaps();
    shownStoryScene.current = storyScene;
  }, [storyScene]);
  const titleActions = titleSaveActions(loaded);
  const learning = useLearning(game, storage, !isDebug);
  const { travelToEvent, returnToHotel, effects: travelEffects } = useTravelEffects({
    getCurrent, commit, nextRomanceRoll, reduceMotion: displaySettings.value.reduceMotion,
  });
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
  const [deleteSnapshot, setDeleteSnapshot] = useState<DeleteSnapshot | null>(null);
  const [confirmDeparture, setConfirmDeparture] = useState(false);
  const [settings, setSettings] = useState(false);
  const [oldDataOpen, setOldDataOpen] = useState(false);
  const [switchJourneyTo, setSwitchJourneyTo] = useState<string | null>(null);
  // This journey's screen is the end of a switch (or of the lock's 再試行):
  // the title's selector has taken the focus back (child effects run first).
  // A resumed game has no selector, so its main area takes the focus instead
  // of leaving it on the page body, unless a scene has already taken it.
  const main = useRef<HTMLElement>(null);
  const restoreSelectorFocus = selectorFocus?.restoreFocus;
  const endSelectorFocus = selectorFocus?.onFocusRestored;
  useEffect(() => {
    if (!endSelectorFocus) return;
    if (restoreSelectorFocus && (!document.activeElement || document.activeElement === document.body))
      main.current?.focus({ preventScroll: true });
    endSelectorFocus();
  }, [restoreSelectorFocus, endSelectorFocus]);
  function requestJourneySwitch(id: string) {
    if (!onSwitchJourney) return;
    const step = leaveStep({ way: "switch_journey", from: journeyId, to: id }, session.hasUnsavedProgress());
    if (step === "ask") {
      setSettings(false);
      setSwitchJourneyTo(id);
    } else if (step === "leave") onSwitchJourney(id);
  }
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [sceneEpoch, setSceneEpoch] = useState(0);
  const [notebook, setNotebook] = useState(false);
  const speed = displaySettings.value.dialogueSpeed;
  const setSpeed = (next: number) => displaySettings.update({ dialogueSpeed: next });
  const [confirmLoad, setConfirmLoad] = useState(false);
  const [showRomanceEnding, setShowRomanceEnding] = useState(false);
  // The title starts with empty fields (the default names are their placeholders); 設定 fills in the current names.
  const [player, setPlayer] = useState(game?.playerName ?? "");
  const [heroine, setHeroine] = useState(game?.heroineName ?? "");

  function begin(event: FormEvent) {
    event.preventDefault();
    session.begin(nameOrDefault(player, balance.defaultPlayerName), nameOrDefault(heroine, balance.defaultHeroineName), journeyId);
  }
  function requestDelete() {
    const result = session.prepareDelete();
    if (result.closeSettings) setSettings(false);
    if (result.snapshot) setDeleteSnapshot(result.snapshot);
  }
  function reload() {
    if (leaveStep({ way: "load_save" }, session.hasUnsavedProgress()) === "ask") {
      setConfirmLoad(true);
      return;
    }
    loadSavedGame();
  }
  function loadSavedGame() {
    if (!session.restore()) return;
    // A load can bring back the same date run (the same scene key): its earlier change is not shown again.
    setShownChange(null);
    // A load replaces the screen under the finger like a scene start, also when the same scene
    // comes back (a date, battle or encounter is a new instance: sceneEpoch): the second tap of a
    // double tap on 「ロード」 or 「ロードする」 must not read the restored line on.
    holdTaps();
    setShowRomanceEnding(false);
    setSceneEpoch((epoch) => epoch + 1);
    setNotebook(false);
  }
  function setAutoSave(enabled: boolean) {
    if (enabled && !session.persistCurrent()) return;
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
  const currentCity = game ? getCityContent(game.currentCityId) : undefined;
  // Before the trip starts, the heading names the selected journey's first city.
  const editionCityName = currentCity?.city.nameJa ?? getJourney(journeyId)?.cities[0].nameJa;
  const currentTravelPlace = game
    ? currentCity!.travel.places.find((place) => place.id === game.travel.currentPlaceId)
    : undefined;
  const departure = game ? getPlayerDeparture(game) : undefined;
  const resultExits = game ? getBattleResultExits(game) : { epilogue: false, leave: false };
  const observationLandmarkId = game ? getBattleObservationLandmarkId(game) : null;
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
        <span className="edition" data-testid="journey-edition">{editionCityName}の旅</span>
      </header>
      {game && <JourneyHud
        game={game}
        place={currentTravelPlace}
        onRecords={() => setRecordsOpen(true)}
        onEnglish={() => openEnglish()}
        onSave={save}
        onLoad={reload}
        onSettings={() => {
          setPlayer(game.playerName);
          setHeroine(game.heroineName);
          // Another tab may have turned Debug mode on or off meanwhile.
          debugMode.refresh();
          setSettings(true);
        }}
      />}
      {game && (
        <div className="journey-stage" aria-label="旅の進行">
          <span>
            {game.activeEpilogue?.kind === "arrival" ? `${currentCity!.city.nameJa}に到着` : reasoningRule
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
              ? game.activeEpilogue.kind === "arrival" ? "旅のはじまり" : "都市エピローグ"
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
      {/* A tap on main's own margin beside a narrow story scene reads on (scene-tap.ts). */}
      <main id="main" ref={main} tabIndex={-1} {...{ [PAGE_MARGIN_ATTRIBUTE]: "" }}>
        {showChanges && <RelationshipChangeNote change={shownChange?.scene === storyScene ? shownChange.change : null} />}
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
            <div className="intro-art" data-testid="title-art">
              <CanalScene compact artwork={getJourney(journeyId)?.titleArt} />
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
                  {titleActions.deletion !== "hidden" && <button
                    className="secondary"
                    type="button"
                    onClick={requestDelete}
                    disabled={titleActions.deletion === "disabled"}
                  >
                    保存データを消去する
                  </button>}
                </div>
              )}
              {!isDebug && onSwitchJourney && <JourneySelection value={journeyId} onChange={requestJourneySwitch} restoreFocus={selectorFocus?.restoreFocus} />}
              {titleActions.start !== "hidden" && <form onSubmit={begin} className="name-form">
                <TitleNameFields player={player} heroine={heroine} onPlayer={setPlayer} onHeroine={setHeroine} />
                <button
                  className="primary"
                  data-testid="title-start"
                  disabled={titleActions.start === "disabled"}
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
              placeJa: encounterLandmark?.nameJa ?? getCityContent(currentEncounter.cityId).city.nameJa,
              background: activeEncounter.frame.background,
              backgroundAsset: encounterImage,
              speaker: activeEncounter.frame.speaker === "heroine" ? game.heroineName : activeEncounter.frame.speaker === "player" ? game.playerName : "旅の風景",
              narration: activeEncounter.frame.speaker !== "heroine" && activeEncounter.frame.speaker !== "player",
              text: activeEncounter.frame.text,
              choices: activeEncounter.frame.choices.map((choice) => {
                const option = encounterChoiceOption(currentEncounter, choice);
                const availability = getEncounterOptionAvailability(game, choice.index);
                return { index: choice.index, textEn: choice.text, translationJa: choice.translationJa ?? option?.translationJa ?? "", cost: option?.cost, unavailableReason: availability.available ? undefined : availability.reason };
              }),
              ended: encounterCanFinish(game),
              finishLabel: activeEncounter.returnTourism ? "観光に戻る" : undefined,
              quiz: (activeEncounter.phase === "quiz" || activeEncounter.phase === "feedback") && currentEncounter.quiz ? {
                id: currentEncounter.quiz.question.id,
                questionEn: currentEncounter.quiz.question.questionEn,
                questionJa: currentEncounter.quiz.translations.questionJa,
                options: currentEncounter.quiz.question.options.map((option, index) => ({ index, textEn: option.textEn, translationJa: currentEncounter.quiz!.translations.options[option.id] })),
                result: encounterFeedback ? `${encounterFeedback.correct ? "正解" : "不正解"}。${encounterFeedback.explanationJa}` : undefined,
              } : undefined,
            }}
            onChoose={(index) => commit((state) => chooseEncounter(state, index, game.revision))}
            onAnswer={(index) => commit((state) => answerEncounterQuiz(state, currentEncounter.quiz!.question.options[index].id, game.revision))}
            onAdvance={() => {
              commit((state) => continueTourismEncounters(state, advanceEncounter(state, game.revision), nextRomanceRoll));
            }}
            onFinish={() => {
              commit((state) => continueTourismEncounters(state, finishEncounter(state, game.revision), nextRomanceRoll));
            }}
          />
        ) : game.activeEpilogue ? (
          <EpilogueScreen
            key={`${game.currentCityId}:${game.activeEpilogue.kind ?? "ending"}`}
            autoAdvanceEnabled={displaySettings.value.autoAdvance}
            game={game}
            speed={speed}
            reduceMotion={displaySettings.value.reduceMotion}
            onSpeed={setSpeed}
            onLogoComplete={() => commit((state) => completeArrivalLogo(state, game.revision))}
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
              resultExits.epilogue
                ? () => commit((state) => startCityEpilogue(state, state.currentCityId, game.revision))
                : undefined
            }
            onLeave={resultExits.leave ? () => {
              commit((state) => leaveBattleResult(state, game.revision));
            } : undefined}
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
                if (!hadEnding && getCurrent()?.endingReached)
                  setShowRomanceEnding(true);
                document.getElementById("main")?.scrollIntoView({ block: "start" });
              }
            }}
          />
        ) : game.endingReached && showRomanceEnding ? (
          <>
            <CanalScene backgroundId={currentTravelPlace?.backgroundId} />
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
            onClaimRewards={() => commit((state) => claimPendingRewards(state, game.revision))}
            onStartEpisode={(id) => commit((state) => startEpisode(state, id))}
            onEpilogue={(id) => commit((state) => startCityEpilogue(state, id, game.revision))}
            onBattle={(id) => commit((state) => startBattle(state, id))}
            onTravelEvent={(id, mode) => travelToEvent(id, mode, game.revision)}
            onRent={(modeId) => commit((state) => rentTransport(state, modeId, game.revision))}
            onTravelWait={(minutes) => commit((state) => waitForTravel(state, minutes, game.revision))}
            onTravelSleep={(mode, viaPlaceId) => returnToHotel(mode, viaPlaceId, game.revision)}
            nextCityName={departure?.city.nameJa}
            onDepart={() => setConfirmDeparture(true)}
          />
        )}
      </main>
      <footer>
        Dreamscape <span>·</span> 旅の余白に、ふたりの物語。
      </footer>
      {confirmDeparture && game && departure && <Modal labelledBy="departure-title" onClose={() => setConfirmDeparture(false)}>
        <h2 id="departure-title">{departure.city.nameJa}へ出発</h2>
        <p>次の街へ進みます。今の街の未使用アイテムは持って行けません。{game.travel.rentedModeIds.length > 0 &&
          `借りている${game.travel.rentedModeIds.map((modeId) => getTransportMode(game.currentCityId, modeId)?.nameJa ?? modeId).join("・")}は返します。`}</p>
        <button type="button" className="primary" onClick={() => {
          if (commit((state) => departToNextCity(state, game.revision))) setConfirmDeparture(false);
        }}>出発する</button>
        <button type="button" className="secondary" onClick={() => setConfirmDeparture(false)}>この街に残る</button>
      </Modal>}
      {recordsOpen && game && <Modal labelledBy="city-records-title" onClose={() => setRecordsOpen(false)}>
        <div className="records-heading"><h2 id="city-records-title">旅の記録</h2><button type="button" className="secondary" onClick={() => setRecordsOpen(false)}>閉じる</button></div>
        <p className="records-travelers">
          <span data-testid="travelers">{game.playerName}<span className="amp"> と </span>{game.heroineName}</span>
          {game.endingReached && <span className="records-relationship">交際中</span>}
        </p>
        <CityRecords game={game} />
      </Modal>}
      {notebook && game && (canObserve || cityNotebook) && (
        <ClueNotebook
          landmarkId={currentLandmarkId ?? undefined}
          cityId={cityNotebook ? currentBattle.cityId : undefined}
          discoveredIds={game.discoveredClueIds}
          readableDocumentIds={getReadableDocumentIds(game)}
          onDiscoverDocument={(id) => commit((state) => discoverClue(state, id, game.revision))}
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
                  maxSelections: reasoningEvidenceCount(reasoningRule) as 1 | 2,
                  selectionEnabled: game.activeBattle.phase === "reasoning",
                  canToggle: (id) => canToggleReasoningClue(game, id),
                  onSelect: (id) =>
                    commit((state) =>
                      selectReasoningClue(state, id, game.revision),
                    ),
                }
              : undefined
          }
          onObserve={
            observationLandmarkId
              ? () => {
                  if (commit((state) => openTourism(state, observationLandmarkId)))
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
      {confirmLoad && (
        <Modal labelledBy="load-title" onClose={() => setConfirmLoad(false)} settlePresses>
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
          {isDebug ? <p>Debug用の進行と英語ノートを消去して、Debugで開いた場面を最初から開き直します。通常のセーブ・英語ノート・表示設定は消去しません。</p> : <><p>
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
          <ConfirmActionButton
            className="danger-button"
            onClick={() => {
              if (!session.deleteConfirmed(deleteSnapshot)) {
                setDeleteSnapshot(null);
                return;
              }
              window.location.reload();
            }}
          >
            {isDebug ? "Debug用の一時データを消去する" : "保存データを消去する"}
          </ConfirmActionButton>
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
        <Modal labelledBy="settings-title" onClose={() => setSettings(false)} settlePresses>
          <h2 id="settings-title">ゲームの設定</h2>
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
          {!isDebug && <DebugModeSetting debugMode={debugMode} />}
          {!isDebug && oldDataStorage && <button type="button" className="text-button old-data-entry"
            onClick={() => { setSettings(false); setOldDataOpen(true); }}>古い保存データの整理</button>}
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
      {oldDataOpen && oldDataStorage && <OldDataCleanup storage={oldDataStorage}
        context={oldDataContext(journeyId)} onClose={() => setOldDataOpen(false)} />}
      {travelEffects}
    </div>
  );
}
