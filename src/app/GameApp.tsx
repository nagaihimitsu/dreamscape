import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  balance,
  dates,
  presentation,
  landmarks,
  localWords,
  scenes,
  storyState,
  tourismAssets,
  getCityContent,
} from "../content";
import { scenePerson, speakingPerson } from "../domain/scene-person";
import { defaultJourneyId, getJourney } from "../content/journeys";
import { JourneySelection, type SelectorFocus } from "../features/journey/JourneySelection";
import { waitForTravel } from "../domain/travel-game";
import { getDayEnd } from "../domain/day-end";
import { rentTransport } from "../domain/transport";
import { bookTour, cancelTourBooking, runningTour, tourLegUnderway, tourSceneBadge } from "../domain/tour";
import { getTransportMode } from "../content/transport";
import { getPlayerDeparture, isJourneyComplete } from "../domain/city-travel";
import { closeRomanceEnding, openOccasion } from "../domain/occasion";
import { resultExitLabel, screenFor } from "../domain/screen";
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
import { CreditsDialog } from "./CreditsDialog";
import { OldDataCleanup } from "./OldDataCleanup";
import { oldDataContext, type KeyedStorage } from "../persistence/old-data";
import { CanalScene } from "../components/CanalScene";
import { secureRomanceRoll } from "../random/romance-source";
import { usePresentationSettings } from "../components/usePresentationSettings";
import { useReadLines } from "../components/useReadLines";
import { RomanceScene } from "../features/romance/RomanceScene";
import { Modal, ModalTitle } from "../components/Modal";
import { ConfirmActionButton } from "../components/ConfirmActionButton";
import { withNames } from "../features/romance/names";
import { BattleScreen } from "../features/battle/BattleScreen";
import { TourismScreen } from "../features/tourism/TourismScreen";
import { ClueNotebook } from "../features/tourism/ClueNotebook";
import { useLearning } from "../features/learning/useLearning";
import { EnglishReview } from "../features/learning/EnglishReview";
import { useLocalWords } from "../features/learning/useLocalWords";
import { LocalWordNotice } from "../features/learning/LocalWordNotice";
import { lineWordsOnScreen } from "../features/learning/local-words";
import { readAloudSupported } from "../features/learning/read-aloud";
import { FreeTimeHub } from "../features/journey/FreeTimeHub";
import { nightButtons, NightScreen } from "../features/journey/NightScreen";
import { CityRecords } from "../features/journey/CityProgress";
import { MetPeople } from "../features/journey/MetPeople";
import { freeTimePhotos, PhotoCredits } from "../features/journey/PhotoCredits";
import { AlbumDialog } from "../features/journey/AlbumDialog";
import { TitleNameFields } from "../features/journey/TitleNameFields";
import { nameOrDefault } from "../domain/player-names";
import { useTravelEffects } from "./useTravelEffects";
import { useJourneyMoments } from "./useJourneyMoments";
import { JourneyHud } from "./JourneyHud";
import { hudView, lineOnScreen } from "./hud-view";
import { albumImageAsset } from "../content/photo-choice";
import { BackgroundCredits } from "../components/BackgroundCredits";
import { EncounterScreen } from "../features/journey/EncounterScreen";
import { placeDisplayName, sceneBackdropPhoto } from "../features/journey/travel-labels";
import { advanceEncounter, chooseEncounter, answerEncounterQuiz, finishEncounter, encounterChoiceDisplay, getEncounterQuizFeedback, getActiveEncounterDefinition, encounterChoiceOption, encounterCanFinish, proceedFromTourism, continueTourismEncounters, encounterLeadsOnward, leaveBattleToFreeTime } from "../domain/encounter";
import { chooseCityEpilogue, epilogueChoiceDisplay } from "../domain/epilogue";
import { dateChoiceDisplay, type GameState } from "../domain/game";
import { chooseTourismGuide, guideChoiceDisplay } from "../domain/tourism";
import type { ChoiceDisplay } from "../domain/scene-effects";
import type { SceneChoiceView } from "../components/SceneChoices";

/** The shown choices of a scene's choice point (hidden ones left out; decision 43), with a greyed-out one's reason. */
function shownSceneChoices(choices: readonly { index: number; text: string; translationJa?: string }[], display: (index: number) => ChoiceDisplay): SceneChoiceView[] {
  return choices.flatMap((choice) => {
    const shown = display(choice.index);
    if (shown.show === "hidden") return [];
    return [{ index: choice.index, text: choice.text, ...(choice.translationJa ? { translationJa: choice.translationJa } : {}),
      ...(shown.show === "grey" ? { reason: shown.reason } : {}) }];
  });
}
import { EpilogueScreen } from "../features/journey/EpilogueScreen";
import { advanceCityEpilogue, completeArrivalLogo } from "../domain/epilogue";
import {
  getBattleResultExits,
  getCurrentEpisode,
  getNextEpisode,
  getNextStoryBattle,
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
  getReasoningContext,
  getActiveBattleContent,
  selectReasoningClue,
  pressBattleClaim,
  submitBattleEvidence,
  canToggleReasoningClue,
  getBattleObservationLandmarkId,
  reasoningEvidenceCount,
  battleChoiceDisplay,
  chooseBattle,
} from "../domain/battle";

import { browserStorage, type AppProps } from "./app-storage";
import { screenOnShow, storySceneChanged, storySceneOnScreen } from "./story-scene-change";
import { focusSceneHeading } from "../components/scene-focus";
import { holdTaps } from "../components/tap-hold";
import { useDebugMode } from "./debug-mode";
import { DebugModeSetting } from "./DebugModeSetting";
import { canReturnToFreeTime, freeTimeReturnState, nextFreeTimeReturn, type FreeTimeReturn } from "./free-time-return";
import { relationshipChange, type RelationshipChange } from "../domain/relationship-change";
import { RelationshipChangeNote } from "../components/RelationshipChangeNote";
import { sceneConditionTruths } from "../domain/scene-conditions";
import { PAGE_MARGIN_ATTRIBUTE } from "../components/scene-tap";
import { portraitFocus } from "../components/speaker-focus";
import { nameCutIn, speakerPlate } from "../components/speaker-plate";

/** Where a Debug relationship change shows (decision 23): the story scene on screen, else the map or free time until the next action. */
function changeScreenKey(state: GameState): string {
  return storySceneOnScreen(state) ?? `screen:${state.revision}`;
}

export function GameApp({
  storage = browserStorage,
  nextRomanceRoll = secureRomanceRoll,
  debug = false,
  debugPanel,
  journeyId = defaultJourneyId,
  onSwitchJourney,
  selectorFocus,
  oldDataStorage,
}: AppProps & { journeyId?: string; onSwitchJourney?: (id: string) => void; selectorFocus?: SelectorFocus; oldDataStorage?: KeyedStorage }) {
  // Only Debug (src/dev/DebugMode.tsx) passes `debug`, on the dev server and, with Debug mode on, in production.
  const isDebug = debug;
  const displaySettings = usePresentationSettings(storage);
  // The lines this device has read in this journey (read-skip.ts): 高速送り stops at one not read before. In this storage,
  // so a Debug session keeps its own record in its isolated memory and never reads or writes the normal one.
  const readLines = useReadLines(storage, displaySettings.value.skipUnread);
  // 「英語を読み上げるボタンを出す」 (ReadAloud.tsx): the setting and the buttons only where the browser can read aloud.
  const [readAloudAvailable] = useState(() => readAloudSupported(typeof window === "undefined" ? undefined : window));
  const readAloud = readAloudAvailable && displaySettings.value.readAloud;
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
  // The travel art of a then: move (set once useTravelEffects is ready below).
  const playMoveRef = useRef<((previous: GameState, next: GameState) => void) | null>(null);
  // The journey's moments a saved change starts (useJourneyMoments, set once it is ready below).
  const momentsRef = useRef<((previous: GameState, next: GameState) => void) | null>(null);
  const session = useGameSession(storage, displaySettings.value.autoSave, (previous, next) => {
    playMoveRef.current?.(previous, next);
    momentsRef.current?.(previous, next);
    // The action that ended a tour (tour stage 2a) says so in free time.
    if (previous.tour && !next.tour && next.completedTourIds.length > previous.completedTourIds.length) session.setNotice("ツアーが終わりました。");
    if (!showChangesRef.current) return;
    const change = relationshipChange(previous, next);
    // Above the story scene on screen, or (decision 23) above the map or free time until the next action.
    if (change) setShownChange({ scene: changeScreenKey(next), change });
  });
  const { game, loaded, invalid, notice, setNotice, commit, getCurrent, save } = session;
  // Debug's 「移動画面に戻る（Debug）」 (free-time-return.ts): the last free-time state, in this tab's memory
  // only. Updated after each render, so the first render of another screen reads the free time before it.
  const debugOn = isDebug || debugMode.on;
  const freeTimeReturn = useRef<FreeTimeReturn | null>(null);
  useEffect(() => {
    freeTimeReturn.current = nextFreeTimeReturn(freeTimeReturn.current, game, journeyId, debugOn);
  }, [game, journeyId, debugOn]);
  const [confirmReturn, setConfirmReturn] = useState(false);
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
  // The words of the country this device has learned in this journey (local-words.ts): the line on screen teaches its
  // # local_word: words. In this storage, so a Debug session keeps its own record in its isolated memory.
  const learnedWords = useLocalWords(storage, lineWordsOnScreen(game));
  const { travelToEvent, returnToHotel, restAtDayEnd, playMove, playing: travelEffectPlaying, nightLeaving, effects: travelEffects } = useTravelEffects({
    getCurrent, commit, nextRomanceRoll, reduceMotion: displaySettings.value.reduceMotion,
  });
  playMoveRef.current = playMove;
  // The day's end (docs/02 「一日の終わり」): free time at 21:00 or later is not shown. When control comes back to it (after a move,
  // a wait, a scene, a date or a tour, a load, the page's start), getDayEnd says what comes instead: with night actions open, the
  // night screen (below); with none, the game rests by itself through the same action as 「休む」 (its cheapest way home) with
  // its one night visual. Once the night screen has shown tonight (this tab's memory), it stays for its 「ホテルで休む」 when its
  // last action is done, so a night never has two night visuals.
  const dayEnd = game ? getDayEnd(game) : null;
  const nightShown = useRef<{ cityId: string; day: number } | null>(null);
  const seen = nightShown.current;
  const nightSeen = !!game && !!seen && seen.cityId === game.currentCityId && seen.day === game.travel.day;
  const nightScreen = !!dayEnd && (dayEnd.actions.length > 0 || nightSeen);
  useEffect(() => {
    if (game && nightScreen) nightShown.current = { cityId: game.currentCityId, day: game.travel.day };
  }, [game, nightScreen]);
  // The game's own rest: before paint, so that late free time is not shown first; after a ride's or a night's art that is still
  // playing (they cover only part of the screen). Once a night: the rest makes it the next morning (or the hotel's scenes), a
  // second call for the same state (StrictMode, a re-render) finds the effect queue busy or the revision moved on
  // (sleepAtHotel), and a refused rest (a failed save) is not tried again for the same state.
  useLayoutEffect(() => {
    if (!game || travelEffectPlaying || !dayEnd || nightScreen) return;
    // A notice not read yet (「保存した場面から再開しました。」 after a load, 「ツアーが終わりました。」) stays: the commit clears it.
    if (restAtDayEnd(dayEnd.way, game.revision, { by: "game" }) && notice) setNotice(notice);
  }, [game, travelEffectPlaying]);
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
  const [creditsOpen, setCreditsOpen] = useState(false);
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
  const [albumOpen, setAlbumOpen] = useState(false);
  const [photoCreditsOpen, setPhotoCreditsOpen] = useState(false);
  const [scenePhotoOpen, setScenePhotoOpen] = useState(false);
  const [sceneEpoch, setSceneEpoch] = useState(0);
  const [notebook, setNotebook] = useState(false);
  const speed = displaySettings.value.dialogueSpeed;
  const setSpeed = (next: number) => displaySettings.update({ dialogueSpeed: next });
  const [confirmLoad, setConfirmLoad] = useState(false);
  // The title starts with empty fields (the default names are their placeholders); 設定 fills in the current names.
  const [player, setPlayer] = useState(game?.playerName ?? "");
  const [heroine, setHeroine] = useState(game?.heroineName ?? "");

  function begin(event: FormEvent) {
    event.preventDefault();
    freeTimeReturn.current = null;
    moments.restart(false);
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
    // Debug's return point belonged to the play before the load, and so did a night screen seen tonight.
    freeTimeReturn.current = null;
    nightShown.current = null;
    // The moments waiting belonged to the play before; the loaded game shows its recap.
    moments.restart(true);
    // A load can bring back the same date run (the same scene key): its earlier change is not shown again.
    setShownChange(null);
    // A load replaces the screen under the finger like a scene start, also when the same scene
    // comes back (a date, battle or encounter is a new instance: sceneEpoch): the second tap of a
    // double tap on 「ロード」 or 「ロードする」 must not read the restored line on.
    holdTaps();
    setSceneEpoch((epoch) => epoch + 1);
    setNotebook(false);
  }
  /** 「戻る」 of Debug's 「移動画面に戻りますか？」: the remembered free-time state replaces the game (saved as an action is). */
  function returnToFreeTime() {
    setConfirmReturn(false);
    const point = freeTimeReturn.current;
    const current = getCurrent();
    // A second press, or a scene that ended by itself meanwhile (auto-advance), finds free time: nothing to undo.
    if (!point || !current || !canReturnToFreeTime(point, current, journeyId, debugOn)) return;
    if (!session.replace(freeTimeReturnState(point, current))) return;
    moments.restart(false);
    // As after a load: the undone scene's relationship change goes, the clue book closes, and the
    // free-time screen that appears under the finger takes no tap for a moment.
    setShownChange(null);
    setNotebook(false);
    holdTaps();
  }
  function setAutoSave(enabled: boolean) {
    if (enabled && !session.persistCurrent()) return;
    if (displaySettings.update({ autoSave: enabled })) setNotice("");
  }
  const active = game?.activeDate;
  // The 「交際開始」 screen is a step of the date's occasion (stage 3b, 3.9 (c)): saved, so a reload shows it again.
  const showRomanceEnding = !!game && screenFor(game) === "romance_ending";
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
  // Free time on show: ⚙設定 then offers 「写真の出典」 of its photos (the cards' and a backdrop photo's).
  const freeTimeShown = !!idle && !showRomanceEnding && !nightScreen;
  const creditPhotos = useMemo(() => (game && freeTimeShown ? freeTimePhotos(game) : []), [game, freeTimeShown]);
  const nextEpisode = game ? getNextEpisode(game) : null;
  const nextStoryBattle = game ? getNextStoryBattle(game) : null;
  const frame = active?.frame;
  // A new screen takes a lost focus on its visible heading (scene-focus.ts, UI redesign §3.7 E);
  // free time opens at the top of the page, not at the scroll position of the screen before it
  // (the title, scrolled to 「旅をはじめる」 on a short phone).
  const screen = nightScreen && game ? `night:${game.currentCityId}` : screenOnShow(game, { sceneEpoch, showRomanceEnding });
  // The title card, the recap, the packing and the credit roll (2026-11-11). A game opened on its save (not Debug) is resumed.
  const moments = useJourneyMoments({ game, screen, resumed: !isDebug && loaded.status === "loaded",
    reduceMotion: displaySettings.value.reduceMotion, effectPlaying: travelEffectPlaying });
  momentsRef.current = moments.committed;
  const shownScreen = useRef(screen);
  useEffect(() => {
    if (shownScreen.current === screen) return;
    shownScreen.current = screen;
    if (screen.startsWith("free:") || screen.startsWith("night:")) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    focusSceneHeading(main.current);
  }, [screen]);
  useEffect(() => {
    if (active?.dateId || showRomanceEnding)
      document.getElementById("main")?.scrollIntoView({ block: "start" });
  }, [active?.dateId, showRomanceEnding]);
  const currentDate = dates.find((date) => date.id === active?.dateId);
  const activeEncounter = game?.activeEncounter;
  const currentEncounter = activeEncounter ? getActiveEncounterDefinition(activeEncounter) : undefined;
  // The scene's person with a portrait (# person:): stands opposite the heroine and names the enemy lines.
  const encounterPerson = currentEncounter ? scenePerson(storyState.people, scenes.find((scene) => scene.id === currentEncounter.id)?.people) : undefined;
  const encounterPlate = game && activeEncounter ? speakerPlate(activeEncounter.frame,
    { heroine: game.heroineName, player: game.playerName, enemy: encounterPerson?.nameJa }, storyState.people) : undefined;
  const encounterLandmark = landmarks.find((landmark) => landmark.id === currentEncounter?.landmarkId);
  // The place the party is at, as the screens name it (the hotel is 「滞在先のホテル」, never its data name).
  const encounterHere = currentEncounter && getCityContent(currentEncounter.cityId).travel.places.find((place) => place.id === game?.travel.currentPlaceId);
  const encounterHereJa = game && encounterHere ? placeDisplayName(game, encounterHere) : undefined;
  const encounterImage = tourismAssets.find((asset) => asset.id === encounterLandmark?.imageAssetId);
  const encounterBackdrop = activeEncounter && !encounterLandmark
    ? sceneBackdropPhoto(activeEncounter.frame.background, presentation.backgrounds, tourismAssets) : undefined;
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
  // The registered photo behind the story scene on screen (in the order of the screens below), whose credits
  // ⚙設定's 「画像の出典」 opens: a scene shows no 出典 of its own (user decision 2026-11-11).
  const photoOf = (id: string | undefined) => (id ? tourismAssets.find((asset) => asset.id === id) : undefined);
  const landmarkPhoto = (id: string | null | undefined) => photoOf(landmarks.find((landmark) => landmark.id === id)?.imageAssetId);
  const backdropPhoto = (backgroundId: string) => photoOf(presentation.backgrounds[backgroundId]?.imageAssetId);
  const scenePhoto = !game ? undefined
    : activeEncounter && currentEncounter ? encounterImage ?? encounterBackdrop?.asset
    : game.activeEpilogue ? undefined
    : game.activeTourism ? (game.activeTourism.phase === "guide" ? landmarkPhoto(game.activeTourism.landmarkId) : undefined)
    : game.activeBattle && currentBattle
      ? landmarkPhoto(currentBattle.landmarkId) ?? backdropPhoto(game.activeBattle.frame?.background ?? currentBattle.backgroundId)
    : active ? backdropPhoto(active.frame.background) : undefined;
  // The photo the line on screen recalls (# recall:): 「画像の出典」 shows its credit too while the line shows.
  const recallId = game ? lineOnScreen(game)?.recall : undefined;
  const recallPhoto = (recallId && albumImageAsset({ assets: tourismAssets, backgrounds: presentation.backgrounds }, recallId)) || undefined;
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
      className={`app-shell${displaySettings.value.reduceMotion ? " reduce-motion" : ""}${conversationActive ? " conversation-active" : ""}${mobilePlayActive ? " mobile-play-active" : ""}${mobileObservationActive ? " mobile-observation-active" : ""}${freeTimeShown ? " free-time-active" : ""}${nightScreen || nightLeaving ? " night-active" : ""}`}
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
        view={hudView(game)}
        onRecords={() => setRecordsOpen(true)}
        onAlbum={() => setAlbumOpen(true)}
        onEnglish={() => openEnglish()}
        onPhotoCredits={creditPhotos.length ? () => setPhotoCreditsOpen(true) : undefined}
        onSceneCredits={scenePhoto || recallPhoto ? () => setScenePhotoOpen(true) : undefined}
        onSave={save}
        onLoad={reload}
        onSettings={() => {
          setPlayer(game.playerName);
          setHeroine(game.heroineName);
          // Another tab may have turned Debug mode on or off meanwhile.
          debugMode.refresh();
          setSettings(true);
        }}
        onReturnToFreeTime={canReturnToFreeTime(freeTimeReturn.current, game, journeyId, debugOn) ? () => setConfirmReturn(true) : undefined}
      />}
      {game && (
        <div className="journey-stage" aria-label="旅の進行">
          <span>
            {game.activeEpilogue?.kind === "arrival" ? `${currentCity!.city.nameJa}に到着`
              : game.activeEpilogue?.kind === "tour_leg" ? runningTour(game)?.titleJa ?? "ツアー" : reasoningRule
              ? `${landmarks.find((item) => item.id === currentLandmarkId)?.nameJa} · 推理クイズ`
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
              ? game.activeEpilogue.kind === "arrival" ? "旅のはじまり" : game.activeEpilogue.kind === "tour_leg" ? "ツアーの移動" : "都市エピローグ"
              : game.activeTourism
                ? game.activeTourism.phase === "guide"
                  ? "観光案内"
                  : "自由な観察"
                : game.activeBattle
                  ? game.activeBattle.phase === "result"
                    ? reasoningRule
                      ? "推理の結果"
                      : "旅の一区切り"
                    : reasoningRule
                      ? "証拠で考える"
                      : "クイズ"
                  : freeTimeAvailable
                    ? "ふたりの自由時間"
                    : "出発前"}
          </span>
        </div>
      )}
      {/* A tap on main's own margin beside a narrow story scene reads on (scene-tap.ts). */}
      <main id="main" ref={main} tabIndex={-1} {...{ [PAGE_MARGIN_ATTRIBUTE]: "" }}>
        {showChanges && <RelationshipChangeNote change={game && shownChange && shownChange.scene === changeScreenKey(game) ? shownChange.change : null}
          conditions={storyScene && game ? sceneConditionTruths(game) : []} />}
        {debugPanel && game && debugPanel(game)}
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
        {moments.recapCard}
        {/* Only where a line can teach a word: a story scene of a build with words of the country. */}
        {conversationActive && localWords.length > 0 && <LocalWordNotice notice={learnedWords.notice} />}
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
              <button type="button" className="text-button credits-entry" onClick={() => setCreditsOpen(true)}>出典・権利の一覧</button>
            </section>
          </>
        ) : moments.packingScene ? moments.packingScene : activeEncounter && currentEncounter ? (
          <EncounterScreen
            autoAdvanceEnabled={displaySettings.value.autoAdvance}
            readSkip={readLines}
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
                const showEnemy = enemy || ((hasEmotion || !!encounterPerson) && frame.speaker === "enemy");
                if (!showHeroine && !showEnemy) return undefined;
                return {
                  ...(showHeroine ? { heroine: { emotion: heroine?.expression ?? (heroineSpeaking ? frame.emotion : "neutral"), mark: heroine?.mark, focus: portraitFocus(frame.speaker, "heroine") } } : {}),
                  ...(showEnemy ? { enemy: { emotion: enemy?.expression ?? (frame.speaker === "enemy" ? frame.emotion : "neutral"), mark: enemy?.mark, focus: portraitFocus(frame.speaker, "enemy") } } : {}),
                };
              })(),
              // A scene at no landmark (a date's, the hotel's, a trip's…; stage 4): in a tour's car (its leg's narration
              // begun, the move not yet: tour stage 3) the leg, even over a road photo; else its background photo's name,
              // else the place the party is at.
              placeJa: encounterLandmark?.nameJa ?? tourLegUnderway(game)?.labelJa ?? encounterBackdrop?.nameJa ??
                encounterHereJa ??
                getCityContent(currentEncounter.cityId).city.nameJa,
              background: activeEncounter.frame.background,
              backgroundAsset: encounterImage,
              speaker: encounterPlate!.name,
              narration: encounterPlate!.narration,
              person: encounterPerson && { characterId: encounterPerson.characterId, focus: portraitFocus(activeEncounter.frame.speaker, "enemy") },
              speakingPerson: speakingPerson(storyState.people, activeEncounter.frame),
              cutIn: nameCutIn(activeEncounter.frame,
                encounterPerson && { nameJa: encounterPerson.nameJa, ...(encounterPerson.titleJa ? { titleJa: encounterPerson.titleJa } : {}) },
                storyState.people),
              text: activeEncounter.frame.text,
              delivery: activeEncounter.frame.delivery,
              staging: activeEncounter.frame,
              phoneNames: { heroine: game.heroineName, player: game.playerName, enemy: encounterPerson?.nameJa },
              // Hidden choices (decision 43) are left out; the letters follow the shown ones.
              choices: activeEncounter.frame.choices.flatMap((choice) => {
                const option = encounterChoiceOption(currentEncounter, choice);
                const shown = encounterChoiceDisplay(game, choice.index);
                if (shown.show === "hidden") return [];
                return [{ index: choice.index, textEn: choice.text, translationJa: choice.translationJa ?? option?.translationJa ?? "", cost: shown.cost,
                  unavailableReason: shown.show === "grey" ? shown.reason : undefined, ...(shown.ap ? { apCost: shown.ap } : {}) }];
              }),
              ended: encounterCanFinish(game),
              // On a running tour (stage 2a) the visit's last scene leads on to the tour's next step; a leg's scenes (stage 3) lead on with
              // the tour. On a booked tour's morning (the hotel's scenes after waking) the last scene leads to the tour's start.
              finishLabel: (game.occasion?.kind === "tour" ? "ツアーを続ける" : undefined) ??
                ({ observe: "観光に戻る", onward: "先へ進む" } as const)[encounterLeadsOnward(game) || "none" as never] ??
                (game.tour?.status === "running" ? "ツアーを続ける"
                  : game.tour?.status === "booked" && game.occasion?.kind === "hotel" && game.occasion.ran.includes("sleep") ? "ツアーに出発する" : undefined),
              badgeJa: tourSceneBadge(game),
              quiz: (activeEncounter.phase === "quiz" || activeEncounter.phase === "feedback") && currentEncounter.quiz ? {
                id: currentEncounter.quiz.question.id,
                questionEn: currentEncounter.quiz.question.questionEn,
                questionJa: currentEncounter.quiz.translations.questionJa,
                options: currentEncounter.quiz.question.options.map((option, index) => ({ index, textEn: option.textEn, translationJa: currentEncounter.quiz!.translations.options[option.id] })),
                result: encounterFeedback ? `${encounterFeedback.correct ? "正解" : "不正解"}。${encounterFeedback.explanationJa}` : undefined,
              } : undefined,
            }}
            onChoose={(index) => commit((state) => chooseEncounter(state, index, game.revision, nextRomanceRoll))}
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
            key={`${game.currentCityId}:${game.activeEpilogue.kind ?? "ending"}:${game.activeEpilogue.episodeId}`}
            autoAdvanceEnabled={displaySettings.value.autoAdvance}
            readSkip={readLines}
            game={game}
            speed={speed}
            reduceMotion={displaySettings.value.reduceMotion}
            onSpeed={setSpeed}
            onLogoComplete={() => commit((state) => completeArrivalLogo(state, game.revision))}
            onAdvance={() =>
              commit((state) => advanceCityEpilogue(state, game.revision))
            }
            choices={shownSceneChoices(game.activeEpilogue.frame.choices, (index) => epilogueChoiceDisplay(game, index))}
            onChoose={(index) => commit((state) => chooseCityEpilogue(state, index, game.revision, nextRomanceRoll))}
          />
        ) : game.activeTourism ? (
          <TourismScreen
            autoAdvanceEnabled={displaySettings.value.autoAdvance}
            readSkip={readLines}
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
            guideChoices={shownSceneChoices(game.activeTourism.frame?.choices ?? [], (index) => guideChoiceDisplay(game, index))}
            onChooseGuide={(index) => commit((state) => chooseTourismGuide(state, index, game.revision, nextRomanceRoll))}
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
            readSkip={readLines}
            key={`${game.activeBattle.runId}-${sceneEpoch}`}
            reduceMotion={displaySettings.value.reduceMotion}
            readAloud={readAloud}
            introHeld={moments.titleHolding}
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
            choices={shownSceneChoices(game.activeBattle.phase === "dialogue" ? game.activeBattle.frame?.choices.filter((choice) => !choice.call) ?? [] : [],
              (index) => battleChoiceDisplay(game, index))}
            onChoose={(index) => commit((state) => chooseBattle(state, index, game.revision, nextRomanceRoll))}
            onAnswer={(id) =>
              commit((state) => answerBattle(state, id, game.revision))
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
                ? () => commit((state) => openOccasion(state, { kind: "epilogue" }, game.revision, nextRomanceRoll))
                : undefined
            }
            // The battle's head then: epilogue (stage 3b): leaving the result goes to the epilogue (4.7).
            leaveLabel={resultExitLabel(game)}
            onLeave={resultExits.leave ? () => {
              commit((state) => leaveBattleToFreeTime(state, game.revision, nextRomanceRoll));
            } : undefined}
          />
        ) : active && frame ? (
          <RomanceScene
            autoAdvanceEnabled={displaySettings.value.autoAdvance}
            readSkip={readLines}
            key={`${active.dateId}-${sceneEpoch}`}
            game={game}
            date={currentDate}
            speed={speed}
            onSpeed={setSpeed}
            reduceMotion={displaySettings.value.reduceMotion}
            onSelect={(index, revision) =>
              commit((state) => chooseDate(state, index, revision))
            }
            choiceDisplay={(index) => dateChoiceDisplay(game, index)}
            onAdvance={() => {
              commit((state) => advanceDate(state, game.revision));
            }}
            onFinish={() => {
              // A confession that succeeded shows 「交際開始」 next: a step of the date's occasion (saved; 3.9 (c)).
              if (commit((state) => finishDate(state, game.revision)))
                document.getElementById("main")?.scrollIntoView({ block: "start" });
            }}
          />
        ) : showRomanceEnding ? (
          <>
            <CanalScene backgroundId={currentTravelPlace?.backgroundId} />
            <section className="paper ending" data-testid="romance-ending">
              <p className="eyebrow">交際開始</p>
              <h1 tabIndex={-1}>{presentation.ending.titleJa}</h1>
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
              <button className="primary" onClick={() => commit((state) => closeRomanceEnding(state, game.revision, nextRomanceRoll))}>
                {resultExitLabel(game) ?? "自由時間へ"} <span aria-hidden="true">→</span>
              </button>
            </section>
          </>
        ) : nightScreen && dayEnd ? (
          <NightScreen
            key={`${game.currentCityId}:${game.travel.day}`}
            game={game}
            buttons={nightButtons(game, dayEnd.actions, departure?.city.nameJa)}
            reduceMotion={displaySettings.value.reduceMotion}
            onAction={(kind) => {
              if (kind === "read_epilogue") commit((state) => openOccasion(state, { kind: "epilogue" }, game.revision, nextRomanceRoll));
              else if (kind === "depart") setConfirmDeparture(true);
              else if (kind === "claim_ap") commit((state) => claimPendingRewards(state, game.revision));
              else restAtDayEnd(dayEnd.way, game.revision, { by: "night_screen", buttons: nightButtons(game, dayEnd.actions, departure?.city.nameJa) });
            }}
            onBookTour={(tourId, offerId) => commit((state) => bookTour(state, tourId, offerId, game.revision))}
            onCancelTour={() => commit((state) => cancelTourBooking(state, game.revision))}
          />
        ) : (
          <FreeTimeHub
            game={game}
            onClaimRewards={() => commit((state) => claimPendingRewards(state, game.revision))}
            onStartEpisode={(id) => commit((state) => startEpisode(state, id))}
            onEpilogue={() => commit((state) => openOccasion(state, { kind: "epilogue" }, game.revision, nextRomanceRoll))}
            onBattle={(id) => commit((state) => startBattle(state, id))}
            onTravelEvent={(id, mode) => travelToEvent(id, mode, game.revision)}
            onRent={(modeId) => commit((state) => rentTransport(state, modeId, game.revision))}
            onBookTour={(tourId, offerId) => commit((state) => bookTour(state, tourId, offerId, game.revision))}
            onCancelTour={() => commit((state) => cancelTourBooking(state, game.revision))}
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
        <ModalTitle id="departure-title">{departure.city.nameJa}へ出発</ModalTitle>
        <p>次の街へ進みます。この街でしか使えない未使用アイテムは、持って行けません。{game.travel.rentedModeIds.length > 0 &&
          `借りている${game.travel.rentedModeIds.map((modeId) => getTransportMode(game.currentCityId, modeId)?.nameJa ?? modeId).join("・")}は返します。`}</p>
        <button type="button" className="primary" onClick={() => {
          if (commit((state) => openOccasion(state, { kind: "depart" }, game.revision, nextRomanceRoll))) setConfirmDeparture(false);
        }}>出発する</button>
        <button type="button" className="secondary" onClick={() => setConfirmDeparture(false)}>この街に残る</button>
      </Modal>}
      {recordsOpen && game && <Modal labelledBy="city-records-title" onClose={() => setRecordsOpen(false)}>
        <ModalTitle id="city-records-title" onClose={() => setRecordsOpen(false)}>旅の記録</ModalTitle>
        <p className="records-travelers">
          <span data-testid="travelers">{game.playerName}<span className="amp"> と </span>{game.heroineName}</span>
          {game.endingReached && <span className="records-relationship">交際中</span>}
        </p>
        <CityRecords game={game} />
        <MetPeople game={game} />
        {isJourneyComplete(game) && <button type="button" className="secondary" onClick={() => { setRecordsOpen(false); moments.openEndRoll(); }}>
          エンドロールを見る</button>}
      </Modal>}
      {albumOpen && game && <AlbumDialog album={game.album} currentCityId={game.currentCityId} onClose={() => setAlbumOpen(false)} />}
      {photoCreditsOpen && creditPhotos.length > 0 && <PhotoCredits photos={creditPhotos} onClose={() => setPhotoCreditsOpen(false)} />}
      {scenePhotoOpen && (scenePhoto || recallPhoto) && <BackgroundCredits asset={scenePhoto} recalled={recallPhoto} onClose={() => setScenePhotoOpen(false)} />}
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
          learnedWords={learnedWords.learned}
          readAloud={readAloud}
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
          <ModalTitle id="load-title">保存した場面を読み込みますか？</ModalTitle>
          <p>まだ保存していない進行は失われます。</p>
          <button className="secondary" autoFocus onClick={() => setConfirmLoad(false)}>戻る</button>
          <button className="primary" onClick={() => { setConfirmLoad(false); loadSavedGame(); }}>ロードする</button>
        </Modal>
      )}
      {/* Opened from ⚙設定's panel, as ロード's confirmation: it takes no press for a moment (settlePresses). */}
      {confirmReturn && game && (
        <Modal labelledBy="free-time-return-title" onClose={() => setConfirmReturn(false)} settlePresses>
          <ModalTitle id="free-time-return-title" eyebrow="Debug">移動画面に戻りますか？</ModalTitle>
          <p>この出来事で変わったことは、すべて元に戻ります。</p>
          <button type="button" className="secondary" autoFocus onClick={() => setConfirmReturn(false)}>やめる</button>
          <button type="button" className="primary" onClick={returnToFreeTime}>戻る</button>
        </Modal>
      )}
      {deleteSnapshot && (
        <Modal
          labelledBy="delete-title"
          onClose={() => setDeleteSnapshot(null)}
        >
          <ModalTitle id="delete-title">{isDebug ? "Debug用の一時データを消去しますか？" : "保存データを消去しますか？"}</ModalTitle>
          {isDebug ? <p>Debug用の進行と英語ノートを消去して、Debugで開いた場面を最初から開き直します。通常のセーブ・英語ノート・表示設定は消去しません。</p> : <><p>
            このブラウザに保存された名前、旅の進行、AP、恋愛・クイズの記録、アルバム、英語ノート（単語帳・その国の言葉）と対訳設定、既読の記録を消去します。元には戻せません。
          </p>
          <p className="fine-print">
            文字の速さなどの表示設定、以前に退避したバックアップ、ほかのサイトのデータは消去しません。ほかの端末やブラウザにも影響しません。
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
          <ModalTitle id="switch-journey-title">旅行編を切り替える</ModalTitle>
          <p>手動セーブしていない進行は失われます。切り替えますか？</p>
          <button className="primary" onClick={() => onSwitchJourney?.(switchJourneyTo)}>切り替える</button>
          <button className="secondary" autoFocus onClick={() => setSwitchJourneyTo(null)}>戻る</button>
        </Modal>
      )}
      {settings && game && (
        <Modal labelledBy="settings-title" onClose={() => setSettings(false)} settlePresses>
          <ModalTitle id="settings-title">ゲームの設定</ModalTitle>
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
            <input type="checkbox" checked={displaySettings.value.skipUnread} disabled={!!displaySettings.error}
              onChange={(event) => displaySettings.update({ skipUnread: event.target.checked })} /> 未読の台詞も高速送りする
          </label>
          {!displaySettings.value.skipUnread && <p className="fine-print">オフの間、高速送りはまだ読んでいない台詞で止まります。</p>}
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
          {readAloudAvailable && <label className="translation-setting">
            <input type="checkbox" checked={displaySettings.value.readAloud} disabled={!!displaySettings.error}
              onChange={(event) => displaySettings.update({ readAloud: event.target.checked })} /> 英語を読み上げるボタンを出す
          </label>}
          {readAloud && <p className="fine-print">クイズと英語ノートの英文の横に出ます。英語の声がない端末では、読まないか、ほかの言葉の声で読みます。</p>}
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
            <p>進行中の会話やクイズ・観光を閉じると、名前を変更できます。</p>
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
          <button type="button" className="text-button credits-entry"
            onClick={() => { setSettings(false); setCreditsOpen(true); }}>出典・権利の一覧</button>
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
      {creditsOpen && <CreditsDialog onClose={() => setCreditsOpen(false)} />}
      {oldDataOpen && oldDataStorage && <OldDataCleanup storage={oldDataStorage}
        context={oldDataContext(journeyId)} onClose={() => setOldDataOpen(false)} />}
      {travelEffects}
      {moments.overlays}
    </div>
  );
}
