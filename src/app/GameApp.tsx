import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  albumImages,
  balance,
  dates,
  presentation,
  landmarks,
  localWords,
  journeyTerms,
  scenes,
  storyState,
  tourismAssets,
  getCityContent,
  tagContext,
} from "../content";
import { scenePerson } from "../domain/scene-person";
import { defaultJourneyId, getJourney, getJourneyForCity, journeys } from "../content/journeys";
import { JourneySelection, type SelectorFocus } from "../features/journey/JourneySelection";
import { waitForTravel } from "../domain/travel-game";
import { getDayEnd } from "../domain/day-end";
import { rentTransport } from "../domain/transport";
import { bookTour, cancelTourBooking, runningTour, tourLegUnderway, tourSceneBadge } from "../domain/tour";
import { buyOutfit, wearOutfit, wornCostume } from "../domain/outfits";
import { WornCostumeContext } from "../components/worn-costume";
import { getTransportMode } from "../content/transport";
import { getPlayerDeparture, isJourneyComplete } from "../domain/city-travel";
import { closeRomanceEnding, openOccasion } from "../domain/occasion";
import { isMomentQuiz } from "../domain/moments";
import { resultExitLabel, screenFor } from "../domain/screen";
import {
  advanceDate,
  chooseDate,
  finishDate,
  setNames,
  setEnglishLevel,
} from "../domain/game";
import { useGameSession } from "./useGameSession";
import { leaveStep } from "./unsaved-progress";
import { titleSaveActions } from "./save-recovery";
import type { DeleteSnapshot } from "./save-deletion";
import { LazyDialog } from "../components/LazyDialog";
import { holdOfflineDownloads, onOfflineEvent, refreshOffline, useOfflineStatus, useOnline, type OfflineEvent } from "../offline/offline-status";
import { offlineDeleteNote, offlineEntryMark, offlineSummary, offlineTitleHint, offlineTitleStatus, offlineToast } from "./offline-summary";
import { oldDataContext, readOldData, type KeyedStorage } from "../persistence/old-data";
import { CanalScene } from "../components/CanalScene";
import { secureRomanceRoll } from "../random/romance-source";
import { usePresentationSettings } from "../components/usePresentationSettings";
import { useVoiceRate, useVoiceSettings } from "../components/useVoice";
import { usePreloadAhead } from "../media/preload-ahead";
import { effectiveVoiceRate } from "../audio/voice-rate";
import { holdSceneCues, playCue, playSe, sceneCuesQuiet, useSoundEffectSettings } from "../audio/sound-effects";
import { canVibrate, useVibrationSetting, vibrate } from "../audio/vibration";
import { heldItemIds } from "../domain/item-changes";
import { NotebookCueContext } from "../components/notebook-cue";
import { addedIds, englishNoteKeys, markSeen, seenAll, unseenIds, type SeenMarks } from "./seen-marks";
import { hasTrack, journeyMusicPlay, useBgmSettings, useSceneMusic } from "../audio/bgm";
import { sceneMusic, type MusicScreen } from "../audio/scene-music";
import { journeyAmbiencePlay, useAmbienceSettings, useSceneAmbience } from "../audio/ambience";
import { sceneAmbience } from "../audio/scene-ambience";
import { useReadLines } from "../components/useReadLines";
import { useMeasuredHeight } from "../components/useMeasuredHeight";
import { RomanceScene } from "../features/romance/RomanceScene";
import { MiniGameProvider, type MiniGameEnvironment } from "../minigames/host/MiniGameProvider";
import { chooseMiniGameOutcome, miniGameAvailableOutcomes } from "../domain/player-action";
import { Modal, ModalAnswers, ModalTitle } from "../components/Modal";
import { withNames } from "../features/romance/names";
import { BattleScreen } from "../features/battle/BattleScreen";
import { TourismScreen } from "../features/tourism/TourismScreen";
import { ClueNotebook } from "../features/tourism/ClueNotebook";
import { clueRecordedNotice } from "../features/tourism/clue-source";
import type { ClueNoticeWord } from "./ClueRecordedNotice";
import { useLearning } from "../features/learning/useLearning";
import { answeredQuestions, latestAnsweredQuestionId, metQuestions } from "../features/learning/EnglishReview";
import { ENGLISH_NOTE_SHOWN, NOTE_PAGE_NAMES, NoteDialog, noteName, type NoteTab } from "./NoteDialog";
import { useLocalWords } from "../features/learning/useLocalWords";
import { LocalWordNotice } from "../features/learning/LocalWordNotice";
import { journeyHasLocalWords, lineFrameOnScreen, lineWordsOnScreen } from "../features/learning/local-words";
import { readAloudSupported } from "../features/learning/read-aloud";
import { primeSpeechOnGesture } from "../features/learning/ReadAloud";
import { FreeTimeHub } from "../features/journey/FreeTimeHub";
import type { SeenCards } from "../features/journey/photo-cards";
import { nightButtons, NightScreen } from "../features/journey/NightScreen";
import { JourneyNumbersCard } from "../features/journey/JourneyNumbers";
import { musicRoomOpen } from "../features/journey/music-room";
import { showsMissedPhotos } from "../features/journey/album-pages";
import { journeyNumbers } from "../features/journey/journey-numbers";
import { freeTimePhotos, recapPhotos, ScreenCredits } from "../features/journey/PhotoCredits";
import { ALBUM_PHOTO_NOTICE_MS, AlbumPhotoNotice, FIRST_ALBUM_PHOTO_NOTICE_MS, type AlbumPhotoNoticeState } from "../features/journey/AlbumPhotoNotice";
import { OpeningMovie } from "../features/journey/OpeningMovie";
import { DepartureLuggage, EndRollDialog } from "../features/journey/JourneyMoments";
import { departureLuggage, endRollOf } from "../features/journey/journey-moments";
import { JourneyMemoriesScreen, KeptMemoryContents } from "../features/journey/JourneyMemories";
import { loadJourneyMemory, type MemoryLoad } from "../persistence";
import { titleArtTint } from "../features/journey/time-of-day";
import { photoTaken } from "../domain/album";
import { metTerms, termsAdded, termsToShow } from "../domain/glossary";
import { GlossaryTermWindow } from "../features/journey/GlossaryTermWindow";
import { DifficultyFields } from "../features/journey/DifficultyFields";
import { DEFAULT_DIFFICULTY, difficultyOf, isJapaneseOnly, type Difficulty } from "../domain/difficulty";
import { useNameReading } from "../features/journey/useNameReading";
import { nameOrDefault } from "../domain/player-names";
import { playerLatinName } from "../domain/name-romaji";
import { useTravelEffects } from "./useTravelEffects";
import { useJourneyMoments } from "./useJourneyMoments";
import { useItemShowLeave } from "./useItemShowLeave";
import { itemOutCard } from "../components/ItemOut";
import { JourneyHud } from "./JourneyHud";
import { hudView } from "./hud-view";
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
  battleBackgroundId,
} from "../domain/battle";

import { browserStorage, type AppProps, type SaveSlots } from "./app-storage";
import { journeyStorage, type SaveSlot } from "../persistence/journey-storage";
import { SaveLoadDialog, SaveSlotList } from "../features/journey/SaveSlots";
import { SettingsDialog } from "./SettingsDialog";
import { ConfirmDialog, DeleteSaveDialog } from "./ConfirmDialogs";
import { TitleScreen } from "./TitleScreen";
import { slotSummaries, summarizeSlot } from "./save-slots";
import { autoSaveLine } from "./journey-hud-text";
import { screenOnShow, storySceneChanged, storySceneOnScreen } from "./story-scene-change";
import { focusSceneHeading } from "../components/scene-focus";
import { holdTaps } from "../components/tap-hold";
import { useDebugMode, useDebugShot, useDebugVoiceRate } from "./debug-mode";
import { DebugModeSetting } from "./DebugModeSetting";
import { canReturnToFreeTime, freeTimeReturnState, nextFreeTimeReturn, type FreeTimeReturn } from "./free-time-return";
import { endIntroMovie, introChange, recordIntro, startIntroTiming, type IntroTiming } from "./intro-timing";
import { relationshipChange, type RelationshipChange } from "../domain/relationship-change";
import { RelationshipChangeNote } from "../components/RelationshipChangeNote";
import { sceneConditionTruths } from "../domain/scene-conditions";
import { PAGE_MARGIN_ATTRIBUTE } from "../components/scene-tap";
import { sceneStageOf, stageLine } from "../components/scene-stage";
import { nameCutIn, speakerPlate } from "../components/speaker-plate";

/** 最初の3分の計測's note (Debug mode only): its own chunk, loaded when ゲームの設定 shows it (scripts/dist-guard.ts). */
const IntroTimingNote = lazy(() => import("./IntroTimingNote"));
/** Debug's 台詞の声の速さ (Debug mode only): its own chunk, loaded when ゲームの設定 shows it (scripts/dist-guard.ts). */
const DebugVoiceRate = lazy(() => import("./DebugVoiceRate"));
/** Debug's 撮影の形 (Debug mode only): its own chunk, loaded when ゲームの設定 shows it (scripts/dist-guard.ts). */
const DebugShotSetting = lazy(() => import("./DebugShotSetting"));
// Dialogs opened from a button, each its own file, loaded when first opened (the title page and the scenes do not need
// them; LazyDialog shows nothing while one loads and says so if it cannot be loaded).
const CreditsDialog = lazy(() => import("./CreditsDialog").then((module) => ({ default: module.CreditsDialog })));
const OldDataCleanup = lazy(() => import("./OldDataCleanup").then((module) => ({ default: module.OldDataCleanup })));
const OfflinePlayDialog = lazy(() => import("./OfflinePlayDialog").then((module) => ({ default: module.OfflinePlayDialog })));
const MusicRoom = lazy(() => import("../features/journey/MusicRoom").then((module) => ({ default: module.MusicRoom })));
const MiniGameCollection = lazy(() => import("../features/journey/MiniGameCollection").then((module) => ({ default: module.MiniGameCollection })));
const TravelLogDialog = lazy(() => import("../features/journey/TravelLog").then((module) => ({ default: module.TravelLogDialog })));

/** Where a Debug relationship change shows (decision 23): the story scene on screen, else the map or free time until the next action. */
function changeScreenKey(state: GameState): string {
  return storySceneOnScreen(state) ?? `screen:${state.revision}`;
}

export function GameApp({
  storage = browserStorage,
  nextRomanceRoll = secureRomanceRoll,
  debug = false,
  debugPanel,
  debugAccess,
  debugShot,
  journeyId = defaultJourneyId,
  onSwitchJourney,
  selectorFocus,
  oldDataStorage,
  saves,
}: AppProps & { journeyId?: string; onSwitchJourney?: (id: string) => void; selectorFocus?: SelectorFocus; oldDataStorage?: KeyedStorage;
  /** The journey's save slots (save-slots.ts); absent in Debug, which plays isolated storage. */
  saves?: SaveSlots }) {
  // Only Debug (src/dev/DebugMode.tsx) passes `debug`, on the dev server and, with Debug mode on, in production.
  const isDebug = debug;
  const displaySettings = usePresentationSettings(storage);
  // The lines this device has read in this journey (read-skip.ts): 高速送り stops at one not read before. In this storage,
  // so a Debug session keeps its own record in its isolated memory and never reads or writes the normal one.
  const readLines = useReadLines(storage, displaySettings.value.skipUnread);
  // 「英語を読み上げるボタンを出す」 (ReadAloud.tsx): the setting and the buttons only where the browser can read aloud.
  const [readAloudAvailable] = useState(() => readAloudSupported(typeof window === "undefined" ? undefined : window));
  const readAloud = readAloudAvailable && displaySettings.value.readAloud;
  // 「問題が出たら英語を自動で読み上げる」 (ReadAloud.tsx useAutoReadAloud, 2026-11-14): on, the page's next tap primes the
  // speech, so that a question can be read with no press (iOS Safari speaks with no gesture only after one).
  const autoReadAloud = readAloudAvailable && displaySettings.value.autoReadAloud;
  useEffect(() => (autoReadAloud ? primeSpeechOnGesture() : undefined), [autoReadAloud]);
  // 「台詞の声を出す」 and 「声の大きさ」 for every line's `# voice:` (useVoice.ts).
  useVoiceSettings(displaySettings.value.voice, displaySettings.value.voiceVolume);
  // 「効果音を出す」 and 「効果音の大きさ」 for the game's sounds and every line's `# se:` (src/audio/sound-effects.ts).
  useSoundEffectSettings(displaySettings.value.se, displaySettings.value.seVolume);
  // 「振動する」 (src/audio/vibration.ts): the setting only where the browser can vibrate.
  const [vibrationAvailable] = useState(() => canVibrate(typeof navigator === "undefined" ? undefined : navigator));
  useVibrationSetting(vibrationAvailable && displaySettings.value.vibration);
  // 「BGMを流す」 and 「BGMの大きさ」 for the background music (src/audio/bgm.ts).
  useBgmSettings(displaySettings.value.bgm, displaySettings.value.bgmVolume);
  // 「環境音を流す」 for the places' ambience, at half of 「BGMの大きさ」 (src/audio/ambience.ts).
  useAmbienceSettings(displaySettings.value.ambience, displaySettings.value.bgmVolume);
  // This device's Debug-mode switch (journeyStorage passes its key through unscoped).
  const debugMode = useDebugMode(storage);
  // Debug's 台詞の声の速さ (debug-mode.ts): this device's Debug preference, so read from the device's storage in a
  // Debug session too (whose game lives in memory). The voices play at it while Debug mode is on (always on Debug's
  // page) and at 1× with it off, whatever is stored (voice-rate.ts).
  const voiceRate = useDebugVoiceRate(browserStorage);
  useVoiceRate(effectiveVoiceRate(isDebug || debugMode.on, voiceRate.rate));
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
  // 「写真の札」 (AlbumPhotoNotice): the photo the player's last action put in the album, for a few seconds.
  const [photoNotice, setPhotoNotice] = useState<AlbumPhotoNoticeState | null>(null);
  // 「手がかり帳に「…」を記録しました。」 (ClueRecordedNotice, 3.11): the words of the clues the player's actions recorded outside
  // the observation, shown one at a time under the header (each waits while another notice shows there).
  const [clueWords, setClueWords] = useState<readonly ClueNoticeWord[]>([]);
  const clueWordKey = useRef(0);
  const dropClueWord = useCallback((key: number) => setClueWords((words) => (words[0]?.key === key ? words.slice(1) : words)), []);
  // 旅の図鑑's card (GlossaryTermWindow): the terms the player's last action put in 旅の図鑑 (`addedTerms`, with whether
  // its line is quiet), then the card that shows them over their story scene (`termCard`) once the line on screen is known
  // not to be passed by 高速送り (below).
  const [addedTerms, setAddedTerms] = useState<{ key: number; ids: string[]; quiet: boolean } | null>(null);
  const [termCard, setTermCard] = useState<{ key: number; ids: string[]; quiet: boolean; scene: string | null } | null>(null);
  // The notices' height under the header (--notices-h): an item card or a large photo starts below them (item-show.css).
  const noticesHeight = useMeasuredHeight("--notices-h");
  // What the player has looked at during this play (seen-marks.ts): the held items in their open detail, the clues in
  // 手がかり帳 and the entries of 英語ノート; one not looked at has its dot (and 「NEW」). In this tab's memory only:
  // a new game, a load and Debug's return empty it (null), and then everything there is counts as seen (below).
  const [seenMarks, setSeenMarks] = useState<SeenMarks | null>(null);
  // Counts the actions that recorded a new clue in 手がかり帳: each gleams on its button (notebook-cue.tsx).
  const [clueGleam, setClueGleam] = useState(0);
  // A journey's opening movie (manifest openingMovie) between 「旅をはじめる」 and the new game, with the names it starts with.
  // `again`: 「もう一度この旅を」's start, with the 旅の思い出 its confirmation said it replaces (its raw value; null for none).
  const [opening, setOpening] = useState<{ videoPath: string; player: string; heroine: string; reading?: string; difficulty: Difficulty; again?: { memory: string | null } } | null>(null);
  // 最初の3分の計測 (Debug mode only; intro-timing.ts): from the last 「旅をはじめる」 in this tab, never saved; a load and
  // Debug's return end it.
  const introTiming = useRef<IntroTiming | null>(null);
  const session = useGameSession(storage, displaySettings.value.autoSave, (previous, next) => {
    // The player acted: the scene a load brought back is theirs again, and its cues sound (sound-effects.ts).
    holdSceneCues(false);
    playMoveRef.current?.(previous, next);
    momentsRef.current?.(previous, next);
    // A line's # photo: just put a photo in the album: its card, and its sound unless the line is quiet or rings its own
    // # se: (and not during 高速送り: playCue). A load or a new game is no action, so it never shows what they bring.
    const photo = photoTaken(previous, next);
    if (photo) {
      const line = lineFrameOnScreen(next);
      setPhotoNotice((last) => ({ id: (last?.id ?? 0) + 1, photo, first: next.album.length === 1, fromLarge: line?.photo?.show === "large" }));
      if (!line?.quiet && !line?.seId) playCue("album_photo");
    }
    // A line's # term: just put terms in 旅の図鑑: their card shows, unless 高速送り passes the line (the effect below).
    const terms = termsAdded(previous, next);
    if (terms.length) setAddedTerms((last) => ({ key: (last?.key ?? 0) + 1, ids: terms, quiet: !!lineFrameOnScreen(next)?.quiet }));
    // A clue just recorded in 手がかり帳: clue_new, a short vibration and the notebook's button gleams (2026-11-13); outside the
    // observation (a clue heard in a scene, 2026-11-18) also a word under the header, which needs no sound or vibration.
    if (addedIds(previous.discoveredClueIds, next.discoveredClueIds).length) {
      setClueGleam((count) => count + 1);
      playSe("clue_new");
      vibrate("clue");
    }
    const clueWord = clueRecordedNotice(previous, next);
    if (clueWord) setClueWords((words) => [...words, { key: ++clueWordKey.current, text: clueWord }]);
    // The action that ended a tour (tour stage 2a) says so in free time, for a moment under the header.
    if (!!previous.tour && !next.tour && next.completedTourIds.length > previous.completedTourIds.length) session.showToast("ツアーが終わりました。");
    if (!showChangesRef.current) return;
    if (introTiming.current) introTiming.current = recordIntro(introTiming.current, performance.now(), introChange(previous, next));
    const change = relationshipChange(previous, next);
    // Above the story scene on screen, or (decision 23) above the map or free time until the next action.
    if (change) setShownChange({ scene: changeScreenKey(next), change });
  });
  const { game, loaded, invalid, notice, setNotice, commit, getCurrent, save } = session;
  // 「日本語のみ」 (the difficulty's English, 2026-11-19): a quiz shows its Japanese translation only, so nothing of it is read aloud.
  const englishOff = !!game && isJapaneseOnly(game);
  // The background loading (src/media/preload-ahead.ts): after each saved change, the pictures and voices of the lines
  // ahead; on the title, the new journey's arrival; nothing while the opening movie streams.
  usePreloadAhead(game, journeyId, !!opening);
  // 「オフラインで遊ぶ」 (2026-11-17; src/offline/): what this device keeps of the journeys, for the entries on the title and
  // in セーブ・ロード and the dialog they open. Not in Debug, nor on a page given another storage (a test's): the entries
  // belong to the game's own page. A journey being loaded starts no new file while the opening movie streams.
  const offline = useOfflineStatus();
  const online = useOnline();
  const offlineEntries = !isDebug && !!oldDataStorage;
  // The ways into the dialog show when the browser has what keeping a journey needs, as known when the page starts.
  // They stay when the dialog itself finds that the browser refuses after all (its storage, its service worker): the
  // dialog says so, and the button that opened it is still there to take the focus back.
  const [offlineEntryShown] = useState(() => offline.support !== "unsupported");
  const [offlineOpen, setOfflineOpen] = useState(false);
  useEffect(() => {
    holdOfflineDownloads(!!opening);
    return () => holdOfflineDownloads(false);
  }, [opening]);
  // What happened to a journey's loading while the player is in the game with the dialog closed: a short word under the header.
  const offlineWord = useRef<(event: OfflineEvent) => void>(() => undefined);
  offlineWord.current = (event) => { if (game && !offlineOpen) session.showToast(offlineToast(event, journeys)); };
  useEffect(() => (offlineEntries ? onOfflineEvent((event) => offlineWord.current(event)) : undefined), [offlineEntries]);
  // A game opened on its save (the page's start, a journey switch) shows its scene as it was: the scene's cues (a line's
  // phone, a city's title...) wait for the player's first action, as after 「ロード」 (loadSavedGame).
  useLayoutEffect(() => {
    holdSceneCues(!!getCurrent());
  // Once, as this game opens.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Counts the loads (and Debug's returns) that put another game in place: the header makes no sound for what they bring.
  const [replacedGame, setReplacedGame] = useState(0);
  // The clues' words waiting belonged to the play before (a load says nothing of what it brings).
  useEffect(() => setClueWords([]), [replacedGame]);
  // Debug's 「移動画面に戻る（Debug）」 (free-time-return.ts): the last free-time state, in this tab's memory
  // only. Updated after each render, so the first render of another screen reads the free time before it.
  const debugOn = isDebug || debugMode.on;
  // Debug's 撮影の形 (debug-mode.ts useDebugShot): this device's Debug preference (a Debug session passes its page's own, which
  // a launch URL's shot=1 turns on). While it is on with Debug mode, the play screens leave out Debug's marks (`debugMarks`);
  // the relationship changes are still followed, so turning it off shows the scene's last one.
  const ownShot = useDebugShot(browserStorage);
  const shot = debugShot ?? ownShot;
  const debugMarks = debugOn && !shot.on;
  const freeTimeReturn = useRef<FreeTimeReturn | null>(null);
  // The cards free time's row has shown during this play, per city (photo-cards.ts newCardIds): a card it has not is
  // dealt in. In this tab's memory only, emptied by a new game, a load and Debug's return (what they bring is not new).
  const seenCards = useRef<SeenCards>(new Map());
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
  // 旅の図鑑's card shows over its scene (below): the notices under the header wait for it to close, not lost behind it.
  const termCardShown = !!termCard && termCard.scene === storyScene;
  // The words of the country this device has learned in this journey (local-words.ts): the line on screen teaches its
  // # local_word: words. In this storage, so a Debug session keeps its own record in its isolated memory. A word of a line
  // that also names a term is learned at once; its 「ことばを覚えた」 shows once the term's card has closed.
  const learnedWords = useLocalWords(storage, lineWordsOnScreen(game), termCardShown);
  // 「ことばを覚えた」 rings (local_word) as its notice comes, but not on a quiet line nor during 高速送り (playCue).
  const learnedNoticeId = learnedWords.notice?.id;
  const quietLine = !!lineFrameOnScreen(game)?.quiet;
  useEffect(() => {
    if (learnedNoticeId !== undefined && !quietLine) playCue("local_word");
  // Once a notice: the line's quiet is read as it comes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learnedNoticeId]);
  const { travelToEvent, returnToHotel, restAtDayEnd, playMove, playing: travelEffectPlaying, nightLeaving, nightLeavingClock, riding, nightVisual, effects: travelEffects } = useTravelEffects({
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
    // A notice not read yet (a refused save) stays: the commit clears it. (A load's or a tour's word is a toast of its own.)
    if (restAtDayEnd(dayEnd.way, game.revision, { by: "game" }) && notice) setNotice(notice);
  }, [game, travelEffectPlaying]);
  // 「ノート」 (NoteDialog.tsx; 2026-11-20): the page it shows, none while it is closed. 英語ノート's question (while it is
  // shown) stays open over a reload (learning.data.openQuestion), and so does the note on that page.
  const [noteTab, setNoteTab] = useState<NoteTab | null>(() => ENGLISH_NOTE_SHOWN && learning.data.openQuestion ? "english" : null);
  const englishOpen = noteTab === "english";
  // The page the note showed last in this tab (its memory only): the menu's 「ノート」 opens on it unless a page has a dot.
  const lastNoteTab = useRef<NoteTab | null>(null);
  // The question 英語ノート showed last in this tab (its memory only). Opened without a question named (the menu's
  // 「英語ノート」, a quiz result's), the note shows that one again while it is listed, else the question answered last,
  // never an empty 「問題を選んでください」 (2026-11-14 user decision).
  const lastEnglishQuestion = useRef<string | null>(null);
  useEffect(() => {
    if (learning.data.openQuestion) lastEnglishQuestion.current = learning.data.openQuestion;
  }, [learning.data.openQuestion]);
  function openEnglish(questionId?: string) {
    if (!ENGLISH_NOTE_SHOWN) return;
    const last = lastEnglishQuestion.current;
    const listed = !!game && !!last && answeredQuestions(game, learning).some((entry) => entry.question.id === last);
    const shown = questionId ?? (listed ? last : game ? latestAnsweredQuestionId(game, learning) : null);
    learning.update((s) => ({
      ...s,
      openQuestion: shown,
      openTopic: null,
    }));
    lastNoteTab.current = "english";
    setNoteTab("english");
  }
  /** Leaving 英語ノート's page (closing the note, or 旅の図鑑): its question no longer opens again on a reload. */
  function leaveEnglish() {
    learning.update((s) => ({ ...s, openQuestion: null, openTopic: null }));
  }
  const [deleteSnapshot, setDeleteSnapshot] = useState<DeleteSnapshot | null>(null);
  const [confirmDeparture, setConfirmDeparture] = useState(false);
  const [settings, setSettings] = useState(false);
  // What セーブ・ロード says about its own actions (in ゲームの設定 until 2026-11-20): why automatic saving could not be turned
  // on, under its checkbox, or why the save data cannot be deleted, under 「保存データの消去」. Other words of the game stay on its page.
  const [saveLoadNotice, setSaveLoadNotice] = useState<{ text: string; at: "autosave" | "delete" } | null>(null);
  const [oldDataOpen, setOldDataOpen] = useState(false);
  // The title's way into 「古い保存データの整理」, beside its notice of a save it cannot open: only when the list has
  // something (read as the notice appears; the dialog says so if a cleanup has emptied it since).
  const titleOldData = useMemo(() => {
    if (game || !invalid || isDebug || !oldDataStorage) return false;
    try { return readOldData(oldDataStorage, oldDataContext(journeyId)).items.length > 0; } catch { return false; }
  }, [game, invalid, isDebug, oldDataStorage, journeyId]);
  const [creditsOpen, setCreditsOpen] = useState(false);
  // セーブ・ロード's line about 「オフラインで遊ぶ」; on the title, the same words for screen readers and a short mark on the entry
  // (a run goes on when the dialog is closed, and no line is added above 「旅をはじめる」 on a short screen).
  const offlineLine = offlineSummary(offline, journeys);
  const offlineMark = offlineEntryMark(offline);
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
  // 「セーブ・ロード」 (SaveSlots.tsx): its dialog (the time it opened, for the line of the last automatic save), the count
  // of saves that drops the ribbon onto ≡メニュー, and the slot whose switch waits for the player to confirm losing unsaved play.
  const [saveLoadOpenedAt, setSaveLoadOpenedAt] = useState<number | null>(null);
  const [saveMark, setSaveMark] = useState(0);
  const [switchSlotTo, setSwitchSlotTo] = useState<SaveSlot | null>(null);
  const playedSlot: SaveSlot = saves?.slot ?? 1;
  // セーブ・ロード's way into 「古い保存データの整理」 (in ゲームの設定 until 2026-11-20): only when the list has something, as
  // on the title (read as セーブ・ロード opens; the entry stays while it is open, where the cleanup gives the focus back, and
  // the cleanup says so if it has emptied the list since).
  const saveLoadOpen = saveLoadOpenedAt !== null;
  const saveLoadOldData = useMemo(() => {
    if (!saveLoadOpen || isDebug || !oldDataStorage) return false;
    try { return readOldData(oldDataStorage, oldDataContext(journeyId)).items.length > 0; } catch { return false; }
  }, [saveLoadOpen, isDebug, oldDataStorage, journeyId]);
  function saveIntoSlot(slot: SaveSlot) {
    setSaveLoadOpenedAt(null);
    const saved = slot === playedSlot || !saves
      ? save()
      : session.saveTo(journeyStorage(saves.base, journeyId, slot), `セーブ${slot}`);
    if (!saved) return;
    playSe("save");
    setSaveMark((count) => count + 1);
  }
  function loadFromSlot(slot: SaveSlot) {
    setSaveLoadOpenedAt(null);
    if (slot === playedSlot) reload();
    else requestSlotSwitch(slot);
  }
  function requestSlotSwitch(slot: SaveSlot) {
    if (!saves) return;
    const step = leaveStep({ way: "switch_slot", from: saves.slot, to: slot }, session.hasUnsavedProgress());
    if (step === "ask") setSwitchSlotTo(slot);
    else if (step === "leave") saves.onSwitch(slot);
  }
  function requestJourneySwitch(id: string) {
    if (!onSwitchJourney) return;
    const step = leaveStep({ way: "switch_journey", from: journeyId, to: id }, session.hasUnsavedProgress());
    // In play its confirmation opens over セーブ・ロード (ゲームの設定 until 2026-11-20), whose 「戻る」 goes back to it.
    if (step === "ask") setSwitchJourneyTo(id);
    else if (step === "leave") onSwitchJourney(id);
  }
  const [recordsOpen, setRecordsOpen] = useState(false);
  // 旅の思い出 (2026-11-19; JourneyMemories.tsx): the journey kept when 「もう一度この旅を」 started this one, read as
  // 旅の記録 opens; its own dialog over 旅の記録 (`keptOpen`), whose 旅の記録, music room and end roll show it, not the game.
  const [keptMemory, setKeptMemory] = useState<MemoryLoad | null>(null);
  const [keptOpen, setKeptOpen] = useState(false);
  const [keptEndRoll, setKeptEndRoll] = useState(false);
  // The kept journey's own 旅の記録, over its 旅の思い出.
  const [keptLogOpen, setKeptLogOpen] = useState(false);
  const keptGame = keptOpen && keptMemory?.status === "loaded" ? keptMemory.state : null;
  function closeKept() {
    setKeptOpen(false);
    setKeptLogOpen(false);
  }
  // 「もう一度この旅を」's confirmation, with the memory it would replace (read as it opens).
  const [confirmAgain, setConfirmAgain] = useState<MemoryLoad | null>(null);
  // Its difficulty: the finished journey's at first, or another level (2026-11-19 user decision).
  const [againDifficulty, setAgainDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  function openAgain() {
    if (game) setAgainDifficulty(difficultyOf(game));
    setConfirmAgain(loadJourneyMemory(storage));
  }
  function openRecords() {
    setKeptMemory(loadJourneyMemory(storage));
    setRecordsOpen(true);
  }
  // 旅の音楽室 (MusicRoom.tsx): open, and the track it plays (the screen's own music again once it stops or closes).
  const [musicRoom, setMusicRoom] = useState(false);
  const [roomTrack, setRoomTrack] = useState<string | null>(null);
  // ミニゲーム集 (MiniGameCollection.tsx; 2026-11-20): beside 旅の音楽室 once the journey is over.
  const [miniGamesOpen, setMiniGamesOpen] = useState(false);
  // 「画面の出典」 (2026-11-20: one item for 写真の出典 and 画像の出典).
  const [screenCreditsOpen, setScreenCreditsOpen] = useState(false);
  const [sceneEpoch, setSceneEpoch] = useState(0);
  const [notebook, setNotebook] = useState(false);
  const speed = displaySettings.value.dialogueSpeed;
  const setSpeed = (next: number) => displaySettings.update({ dialogueSpeed: next });
  const [confirmLoad, setConfirmLoad] = useState(false);
  // The title starts with empty fields (the default names are their placeholders); 設定 fills in the current names.
  const [player, setPlayer] = useState(game?.playerName ?? "");
  const [heroine, setHeroine] = useState(game?.heroineName ?? "");
  // The title's difficulty for a new journey (2026-11-19).
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  // The reading of the player's name, captured as it is typed in the title's and the settings' forms (nothing shows it).
  const titleReading = useNameReading();
  const settingsReading = useNameReading(game?.playerNameReading);
  // The marks of what is new (seenMarks above): the memory starts from everything there is, and what the player opens is seen.
  // 英語ノート's entries, read again when an answer, a record or a word learned changes (the records' content is checked).
  const englishKey = useMemo(
    () => (game ? englishNoteKeys(ENGLISH_NOTE_SHOWN ? metQuestions(game, learning) : [], learnedWords.learned) : []).join("\n"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [!!game, game?.battleRecords, game?.pastBattleIds, game?.activeBattle?.battleId, game?.activeBattle?.contentHash, game?.activeBattle?.answers, learning.data.records, learnedWords.learned],
  );
  const englishIds = englishKey ? englishKey.split("\n") : [];
  useEffect(() => {
    if (game && !seenMarks) setSeenMarks(seenAll({ items: heldItemIds(game.inventory), clues: game.discoveredClueIds, english: englishIds, glossary: metTerms(game) }));
  });
  useEffect(() => {
    if (notebook && game) setSeenMarks((marks) => marks && markSeen(marks, "clues", game.discoveredClueIds));
  }, [notebook, game]);
  // 英語ノート's entries are its questions; the words of the country (`word:` marks of the same memory) are 旅のことば's.
  const isWordMark = (id: string) => id.startsWith("word:");
  const questionMarks = englishIds.filter((id) => !isWordMark(id));
  const wordMarks = englishIds.filter(isWordMark);
  useEffect(() => {
    if (noteTab === "english") setSeenMarks((marks) => marks && markSeen(marks, "english", questionMarks));
    if (noteTab === "words") setSeenMarks((marks) => marks && markSeen(marks, "english", wordMarks));
  // The entries as a key: the list itself is made again at each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteTab, englishKey]);
  const notebookCue = { gleam: clueGleam, unseen: !!game && unseenIds(seenMarks?.clues, game.discoveredClueIds).length > 0 };
  const englishNew = unseenIds(seenMarks?.english, questionMarks).length > 0;
  const wordsNew = unseenIds(seenMarks?.english, wordMarks).length > 0;
  // 旅の図鑑: in ≡メニュー for a journey that has terms; its dot while a term met in play has not been seen there. Opening it
  // shows 「NEW」 on those terms (as they were as it opened) and counts them as seen.
  // The journey of the game on screen (a Debug session opens any journey's scene).
  const glossaryJourneyId = (game && getJourneyForCity(game.currentCityId)?.id) ?? journeyId;
  const hasTerms = journeyTerms(glossaryJourneyId).length > 0;
  const metGlossary = game ? metTerms(game) : [];
  const glossaryNew = unseenIds(seenMarks?.glossary, metGlossary).length > 0;
  // The terms new as 旅の図鑑's page opened (its 「NEW」), counted as seen from then.
  const [glossaryNewIds, setGlossaryNewIds] = useState<string[]>([]);
  function openGlossary() {
    if (!hasTerms) return;
    if (noteTab === "english") leaveEnglish();
    setGlossaryNewIds(unseenIds(seenMarks?.glossary, metGlossary));
    setSeenMarks((marks) => marks && markSeen(marks, "glossary", metGlossary));
    lastNoteTab.current = "glossary";
    setNoteTab("glossary");
  }
  // 旅のことば (2026-11-20): for a journey with words of the country, or once this device has learned one in it.
  const hasWords = journeyHasLocalWords(glossaryJourneyId) || learnedWords.learned.length > 0;
  // The note's pages, in their order (none: no 「ノート」 in ≡メニュー).
  const notePages = ([ENGLISH_NOTE_SHOWN && "english", hasWords && "words", hasTerms && "glossary"] as const)
    .filter((page): page is NoteTab => !!page);
  const newNotePages = notePages.filter((page) => page === "english" ? englishNew : page === "words" ? wordsNew : glossaryNew);
  function openWords() {
    if (noteTab === "english") leaveEnglish();
    lastNoteTab.current = "words";
    setNoteTab("words");
  }
  function openNotePage(page: NoteTab) {
    if (page === "english") openEnglish();
    else if (page === "words") openWords();
    else openGlossary();
  }
  /** ≡メニュー's 「ノート」: on the first page with something new, else on the page shown last, else on the first. */
  function openNote() {
    const last = lastNoteTab.current;
    openNotePage(newNotePages[0] ?? (last && notePages.includes(last) ? last : notePages[0]));
  }
  function closeNote() {
    if (noteTab === "english") leaveEnglish();
    setNoteTab(null);
  }
  // The card of the terms an action added waits for the line on screen to be drawn: 高速送り (and a scene a load brought
  // back) keeps it from opening (sceneCuesQuiet; the terms are in 旅の図鑑 all the same). The scene's own effects have run
  // by then (a child's before its parent's), so 高速送り that stops at this unread line lets the card show.
  useEffect(() => {
    const ids = addedTerms ? termsToShow(addedTerms.ids, sceneCuesQuiet()) : [];
    if (addedTerms && ids.length) setTermCard({ ...addedTerms, ids, scene: storyScene });
  // Once for each action that added terms (the scene on screen is read as it is then).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addedTerms]);
  // The card belongs to its scene: another screen (a load, Debug's return) takes it away.
  useEffect(() => {
    if (termCard && termCard.scene !== storyScene) setTermCard(null);
  }, [termCard, storyScene]);
  // The title art's colour of the device's time of day (2026-11-13), read once as the title opens (static, never animated).
  const [titleTint] = useState(() => titleArtTint(new Date().getHours()));

  function begin(event: FormEvent) {
    event.preventDefault();
    playSe("ui_confirm");
    const playerName = nameOrDefault(player, balance.defaultPlayerName);
    const heroineName = nameOrDefault(heroine, balance.defaultHeroineName);
    const reading = titleReading.read(playerName);
    // A journey with an opening movie plays it first (not in Debug); the game starts when it ends, so its first scene
    // (the arrival's title, its sounds) is not run under the movie.
    const movie = isDebug ? undefined : getJourney(journeyId)?.openingMovie;
    // Debug mode measures the first minutes from here (with and without the movie).
    introTiming.current = debugOn ? startIntroTiming(performance.now(), !!movie) : null;
    if (movie) setOpening({ videoPath: movie.videoPath, player: playerName, heroine: heroineName, reading, difficulty });
    else startJourney(playerName, heroineName, reading, difficulty);
  }
  function startJourney(playerName: string, heroineName: string, reading: string | undefined, chosen: Difficulty, again?: { memory: string | null }) {
    freeTimeReturn.current = null;
    seenCards.current = new Map();
    setSeenMarks(null);
    moments.restart(false);
    holdSceneCues(false);
    if (!again) session.begin(playerName, heroineName, reading, journeyId, chosen);
    else if (session.beginAgain(journeyId, again.memory, chosen)) {
      // A new journey under the finger of 「最初から始める」: its first scene takes no tap of the same press.
      holdTaps();
      setSceneEpoch((epoch) => epoch + 1);
    }
  }
  /** 「もう一度この旅を」's 「最初から始める」 at the difficulty chosen there: the journey's opening movie first, as from the title (not in Debug). */
  function beginAgain(memory: string | null, chosen: Difficulty) {
    if (!game) return;
    playSe("ui_confirm");
    setConfirmAgain(null);
    const movie = isDebug ? undefined : getJourney(journeyId)?.openingMovie;
    introTiming.current = debugOn ? startIntroTiming(performance.now(), !!movie) : null;
    const again = { memory };
    if (movie) setOpening({ videoPath: movie.videoPath, player: game.playerName, heroine: game.heroineName, reading: game.playerNameReading, difficulty: chosen, again });
    else startJourney(game.playerName, game.heroineName, game.playerNameReading, chosen, again);
  }
  /**
   * 保存データの消去 (「セーブ・ロード」's since 2026-11-20, or the title's): its confirmation opens over 「セーブ・ロード」, whose
   * 「消去せず戻る」 goes back to it (2026-11-14 user decision); why it cannot be asked is said where it was asked.
   */
  function requestDelete() {
    setSaveLoadNotice(null);
    const snapshot = session.prepareDelete(saveLoadOpenedAt !== null ? (text) => setSaveLoadNotice({ text, at: "delete" }) : undefined);
    if (snapshot) setDeleteSnapshot(snapshot);
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
    // The restored scene's cues wait for the player's next action; the header makes no sound for what the load brings.
    holdSceneCues(true);
    setReplacedGame((count) => count + 1);
    // Debug's return point belonged to the play before the load, and so did a night screen seen tonight, the cards seen
    // and what was looked at (its marks start again from what the load brings).
    freeTimeReturn.current = null;
    seenCards.current = new Map();
    setSeenMarks(null);
    nightShown.current = null;
    // The moments waiting belonged to the play before; the loaded game shows its recap. So did Debug's measure.
    moments.restart(true);
    introTiming.current = null;
    // A load can bring back the same date run (the same scene key): its earlier change is not shown again, nor its photo card.
    setShownChange(null);
    setPhotoNotice(null);
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
    introTiming.current = null;
    seenCards.current = new Map();
    setSeenMarks(null);
    setReplacedGame((count) => count + 1);
    // As after a load: the undone scene's relationship change goes, the clue book closes, and the
    // free-time screen that appears under the finger takes no tap for a moment.
    setShownChange(null);
    setNotebook(false);
    holdTaps();
  }
  /**
   * Debug's bar (its flags and clock, src/dev/debug-edits.ts, only while no scene is open): `change(game)` replaces the game as
   * returnToFreeTime's state does, with the revision after the current one (no control of the screen before acts on it), saved
   * as an action is; the header makes no sound for what it brings. A throw of `change` (its reason) passes through.
   */
  function replaceForDebug(change: (state: GameState) => GameState): boolean {
    const current = getCurrent();
    if (!current) return false;
    const next = change(current);
    if (!session.replace({ ...next, revision: current.revision + 1 })) return false;
    setReplacedGame((count) => count + 1);
    setShownChange(null);
    return true;
  }
  useEffect(() => {
    if (!debugAccess) return;
    debugAccess.current = { game: getCurrent, replace: replaceForDebug };
    return () => { debugAccess.current = null; };
  });
  function setAutoSave(enabled: boolean) {
    setSaveLoadNotice(null);
    if (enabled && !session.persistCurrent((text) => setSaveLoadNotice({ text, at: "autosave" }))) return;
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
  // A photo shown large (# photo_show: large, PhotoShowLayer) has its card only once its line has gone: the card then
  // comes from the large picture. The card goes after its few seconds, or with the story scene it was shown over.
  const linePhoto = lineFrameOnScreen(game)?.photo;
  const largePhotoId = linePhoto?.show === "large" ? linePhoto.imageId : undefined;
  // 旅の図鑑's card holds the photo's card as it holds 「ことばを覚えた」: it shows (its whole time) once the card closes.
  const shownPhotoNotice = photoNotice && photoNotice.photo.imageId !== largePhotoId && !termCardShown ? photoNotice : null;
  const shownPhotoNoticeId = shownPhotoNotice?.id;
  useEffect(() => {
    if (!shownPhotoNotice) return;
    const timer = window.setTimeout(() => setPhotoNotice(null), shownPhotoNotice.first ? FIRST_ALBUM_PHOTO_NOTICE_MS : ALBUM_PHOTO_NOTICE_MS);
    return () => window.clearTimeout(timer);
  // Once a card shows: its timer runs from then.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownPhotoNoticeId]);
  useEffect(() => {
    if (!conversationActive) setPhotoNotice(null);
  }, [conversationActive]);
  // A line's item card (# item_show:, ItemShowLayer) and its way into the header's bag as the line goes: 「…を手に入れました」
  // waits until the card has gone.
  const lineItemId = lineFrameOnScreen(game)?.itemShow;
  const itemLeave = useItemShowLeave(lineItemId, game?.inventory, replacedGame);
  // A line's item taken out (# item_out:, ItemOutLayer) goes back into the bag the same way as its line goes (the same
  // item on the next line keeps its card); the notices wait for it too.
  const lineItemOutId = lineFrameOnScreen(game)?.itemOut?.itemId;
  const itemOutLeave = useItemShowLeave(lineItemOutId, game?.inventory, replacedGame);
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
  // Free time on show (its photos are in ≡メニュー's 「画面の出典」: creditPhotos below).
  const freeTimeShown = !!idle && !showRomanceEnding && !nightScreen;
  const nextEpisode = game ? getNextEpisode(game) : null;
  const nextStoryBattle = game ? getNextStoryBattle(game) : null;
  const frame = active?.frame;
  // A line's # minigame: in any story screen (docs/13 1.5): what every play gets, once; a quiet game lowers the music.
  const [miniGameQuiet, setMiniGameQuiet] = useState(false);
  // A game's own music (docs/13 2.11): its track while it plays, only once the build has it (else the scene's goes on).
  const [miniGameTrack, setMiniGameTrack] = useState<string | null>(null);
  const revision = game?.revision ?? 0;
  // The outcomes whose choices can be taken now (a payment the player cannot afford greys one; its fallback is taken).
  const miniGameAvailable = (game && miniGameAvailableOutcomes(game))?.join(" ");
  const miniGameEnvironment = useMemo<MiniGameEnvironment>(() => ({
    auto: displaySettings.value.miniGameAuto,
    debug: debugMarks,
    reduceMotion: displaySettings.value.reduceMotion,
    names: { player: game?.playerName ?? "", heroine: game?.heroineName ?? "",
      playerLatin: game ? playerLatinName(game.playerNameReading, game.playerName) : null },
    revision,
    context: tagContext,
    ...(miniGameAvailable !== undefined ? { available: miniGameAvailable ? miniGameAvailable.split(" ") : [] } : {}),
    // The outcome's choice, as the screen's choice button takes it (player-action.ts).
    onOutcome: (outcome) => commit((state) => chooseMiniGameOutcome(state, outcome, revision, nextRomanceRoll)),
    backdrop: (backgroundId) => <CanalScene backgroundId={backgroundId} />,
    onQuiet: setMiniGameQuiet,
    onMusic: (track) => setMiniGameTrack(track && hasTrack(track) ? track : null),
  }), [displaySettings.value.miniGameAuto, displaySettings.value.reduceMotion, debugMarks, game?.playerName, game?.heroineName, game?.playerNameReading,
    revision, miniGameAvailable, commit, nextRomanceRoll]);
  // ミニゲーム集's plays: the same settings and music as a story's, no choice to take (MiniGameCollection.tsx).
  const collectionPlay = useMemo(() => ({
    auto: displaySettings.value.miniGameAuto,
    reduceMotion: displaySettings.value.reduceMotion,
    onQuiet: setMiniGameQuiet,
    onMusic: (track: string | null) => setMiniGameTrack(track && hasTrack(track) ? track : null),
  }), [displaySettings.value.miniGameAuto, displaySettings.value.reduceMotion]);
  // A new screen takes a lost focus on its visible heading (scene-focus.ts, UI redesign §3.7 E);
  // free time opens at the top of the page, not at the scroll position of the screen before it
  // (the title, scrolled to 「旅をはじめる」 on a short phone).
  const screen = nightScreen && game ? `night:${game.currentCityId}` : screenOnShow(game, { sceneEpoch, showRomanceEnding });
  // The title card, the recap, the packing and the credit roll (2026-11-11). A game opened on its save (not Debug) is resumed.
  const moments = useJourneyMoments({ game, screen, resumed: !isDebug && loaded.status === "loaded",
    reduceMotion: displaySettings.value.reduceMotion, effectPlaying: travelEffectPlaying, learnedWords: learnedWords.learned });
  momentsRef.current = moments.committed;
  // ≡メニュー's 「画面の出典」: the photos free time shows (the cards' and a backdrop photo's) and, in free time or on the night
  // screen, the recap card's place photo while it shows (2026-11-15: the card shows no credit of its own).
  const creditPhotos = useMemo(() => [
    ...recapPhotos(moments.recapPicture),
    ...(game && freeTimeShown ? freeTimePhotos(game) : []),
  ], [game, freeTimeShown, moments.recapPicture]);
  // The music of what this screen shows (src/audio/scene-music.ts): the journey's tracks (the game's own journey, also in
  // Debug), the scene's # bgm:, and the quiz's, a quiet line's and a ride's lowering. Never anything of the relationship.
  const musicJourneyId = (game && getJourneyForCity(game.currentCityId)?.id) ?? journeyId;
  const musicScreen: MusicScreen = {
    game, endRoll: moments.endRollShown, nightVisual, riding, packing: !!moments.packingScene,
    romanceEnding: showRomanceEnding, nightScreen: !!(nightScreen && dayEnd), opening: !!opening,
    ...(musicRoom && roomTrack ? { roomTrack } : {}), miniGameQuiet, ...(miniGameTrack ? { miniGameTrack } : {}),
  };
  useSceneMusic(sceneMusic(journeyMusicPlay(musicJourneyId), musicScreen));
  // The ambience under it (src/audio/scene-ambience.ts): the scene's # ambience:, else its place's own, in story scenes only.
  useSceneAmbience(sceneAmbience(journeyAmbiencePlay(musicJourneyId), musicScreen));
  const shownScreen = useRef(screen);
  useEffect(() => {
    if (shownScreen.current === screen) return;
    shownScreen.current = screen;
    if (screen.startsWith("free:") || screen.startsWith("night:")) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (screen.startsWith("free:") && introTiming.current) introTiming.current = recordIntro(introTiming.current, performance.now(), { milestones: ["free"] });
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
  // ≡メニュー's 「画面の出典」 opens: a scene shows no 出典 of its own (user decision 2026-11-11).
  const photoOf = (id: string | undefined) => (id ? tourismAssets.find((asset) => asset.id === id) : undefined);
  const landmarkPhoto = (id: string | null | undefined) => photoOf(landmarks.find((landmark) => landmark.id === id)?.imageAssetId);
  const backdropPhoto = (backgroundId: string) => photoOf(presentation.backgrounds[backgroundId]?.imageAssetId);
  // The sources of the quiz explanation on screen, listed there too (2026-11-20: the explanation shows none of its own).
  const explanationSources = game?.activeBattle?.phase === "feedback" && activeBattleContent
    ? activeBattleContent.quiz.questions[game.activeBattle.roundIndex]?.sources : undefined;
  const scenePhoto = !game ? undefined
    : activeEncounter && currentEncounter ? encounterImage ?? encounterBackdrop?.asset
    : game.activeEpilogue ? undefined
    : game.activeTourism ? (game.activeTourism.phase === "guide" ? landmarkPhoto(game.activeTourism.landmarkId) : undefined)
    : game.activeBattle && currentBattle
      ? landmarkPhoto(currentBattle.landmarkId) ?? backdropPhoto(battleBackgroundId(game.activeBattle, currentBattle))
    : active ? backdropPhoto(active.frame.background) : undefined;
  // The background the story scene on screen draws its picture from (in the order of the screens below): the header's
  // place plate names where it is, if it says (hudPlaceName). None where a landmark's photo shows: the party is there.
  // A battle's quiz, reasoning and result keep its last line's (battleBackgroundId), so the plate stays where the story is.
  // A moment quiz (2026-11-18) is not where the map took the party: its background, else its landmark, names the plate.
  const momentQuiz = !!game?.activeBattle && !game.activeEncounter && !game.activeEpilogue && !game.activeTourism && isMomentQuiz(game.activeBattle.battleId);
  const sceneBackgroundId = !game || moments.packingScene ? undefined
    : activeEncounter && currentEncounter ? (encounterImage ? undefined : activeEncounter.frame.background)
    : game.activeEpilogue ? game.activeEpilogue.frame.background
    : game.activeTourism ? (landmarkPhoto(game.activeTourism.landmarkId) ? undefined : game.activeTourism.frame?.background)
    : game.activeBattle && currentBattle
      ? (landmarkPhoto(currentBattle.landmarkId) && !momentQuiz ? undefined : battleBackgroundId(game.activeBattle, currentBattle))
    : active?.frame.background;
  /** 「服」's or the shop's change of clothes (outfits.ts wearOutfit): in free time only, with a short sound once she has changed. */
  function wear(outfitId: string | null): boolean {
    const changed = commit((state) => wearOutfit(state, outfitId, state.revision));
    if (changed) playSe("ui_confirm");
    return changed;
  }
  const scenePlaceJa = momentQuiz && currentBattle ? landmarks.find((landmark) => landmark.id === currentBattle.landmarkId)?.nameJa : undefined;
  return (
    <WornCostumeContext.Provider value={game ? wornCostume(game) : undefined}>
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
        clock={nightLeavingClock}
        place={currentTravelPlace}
        sceneBackgroundId={sceneBackgroundId}
        scenePlaceJa={scenePlaceJa}
        view={hudView(game)}
        onRecords={openRecords}
        onNote={notePages.length ? openNote : undefined}
        noteLabel={noteName(notePages)}
        onScreenCredits={() => setScreenCreditsOpen(true)}
        onSaveLoad={() => {
          setSaveLoadNotice(null);
          // What the device keeps for 「オフラインで遊ぶ」 may have changed meanwhile (a run that ended, another tab).
          if (offlineEntries) void refreshOffline();
          setSaveLoadOpenedAt(Date.now());
        }}
        saveMark={saveMark}
        toast={session.toast}
        clueNotice={clueWords[0] ?? null}
        onClueNoticeDone={dropClueWord}
        replaced={replacedGame}
        seenItemIds={seenMarks?.items}
        onItemsSeen={(ids) => setSeenMarks((marks) => marks && markSeen(marks, "items", ids))}
        noteNew={newNotePages.map((page) => NOTE_PAGE_NAMES[page])}
        // 「…を手に入れました」 waits while the notices over a story scene show (one under the header at a time), and while a
        // line's item card (# item_show:, # item_out:) shows or flies into the bag.
        holdNotices={!!shownPhotoNotice || !!learnedWords.notice || !!lineItemId || !!itemLeave || !!lineItemOutId || !!itemOutLeave}
        itemFlight={itemLeave}
        itemOutFlight={itemOutLeave}
        onSettings={() => {
          setPlayer(game.playerName);
          setHeroine(game.heroineName);
          // Another tab may have turned Debug mode on or off, or changed Debug's speed of the voices or 撮影の形, meanwhile.
          debugMode.refresh();
          voiceRate.refresh();
          shot.refresh();
          setSettings(true);
        }}
        onWearOutfit={wear}
        onReturnToFreeTime={debugMarks && canReturnToFreeTime(freeTimeReturn.current, game, journeyId, debugOn) ? () => setConfirmReturn(true) : undefined}
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
                    ? isJourneyComplete(game) ? "旅の思い出" : "ふたりの街歩き"
                    : "出発前"}
          </span>
        </div>
      )}
      {/* A tap on main's own margin beside a narrow story scene reads on (scene-tap.ts). The screens' 手がかり帳 buttons
          read their marks from NotebookCueContext. */}
      <NotebookCueContext.Provider value={notebookCue}>
      <MiniGameProvider value={miniGameEnvironment}>
      <main id="main" ref={main} tabIndex={-1} {...{ [PAGE_MARGIN_ATTRIBUTE]: "" }}>
        {debugMarks && <RelationshipChangeNote change={game && shownChange && shownChange.scene === changeScreenKey(game) ? shownChange.change : null}
          conditions={storyScene && game ? sceneConditionTruths(game) : []} />}
        {debugPanel && game && debugMarks && debugPanel(game)}
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
        {/* Only where a line can teach a word or take a photo: a story scene of a build with words of the country or
            album images. Their status regions stay mounted through the scene, so a new notice is announced. */}
        {conversationActive && (localWords.length > 0 || albumImages.length > 0) && (
          <div className="scene-notices" ref={noticesHeight}>
            {localWords.length > 0 && <LocalWordNotice notice={learnedWords.notice} />}
            {albumImages.length > 0 && <AlbumPhotoNotice notice={shownPhotoNotice} />}
          </div>
        )}
        {!game ? (
          <TitleScreen art={{ artwork: getJourney(journeyId)?.titleArt, tint: titleTint }}
            problem={invalid ? { loaded, message: invalid, deletion: titleActions.deletion, onDelete: requestDelete,
              onOldData: titleOldData ? () => setOldDataOpen(true) : undefined } : null}
            journeyChoice={!isDebug && onSwitchJourney && <>
              {/* The way into 「オフラインで遊ぶ」 sits beside the selector's caption (the title shows only without a game: a
                  player with a save finds it in ≡メニューの「セーブ・ロード」). */}
              <JourneySelection value={journeyId} onChange={requestJourneySwitch} restoreFocus={selectorFocus?.restoreFocus}
                aside={offlineEntries && offlineEntryShown ? <button type="button" className="text-button offline-entry" data-testid="offline-entry"
                  onClick={() => setOfflineOpen(true)}>オフラインで遊ぶ{offlineMark && `（${offlineMark}）`}</button> : undefined} />
              {offlineEntries && offlineEntryShown && <p role="status" className="sr-only" data-testid="offline-title-status">{offlineTitleStatus(offline, journeys)?.text}</p>}
              {offlineEntries && offlineTitleHint(offline, online, journeyId) && <p className="fine-print offline-hint">{offlineTitleHint(offline, online, journeyId)}</p>}
            </>}
            saveSlots={saves && <SaveSlotList saves={saves} onChoose={requestSlotSwitch} />}
            start={{ action: titleActions.start, player, heroine, onPlayer: setPlayer, onHeroine: setHeroine, playerRef: titleReading.ref,
              difficulty, onDifficulty: setDifficulty, journeyId, onBegin: begin }}
            autoSave={displaySettings.value.autoSave} onCredits={() => setCreditsOpen(true)} />
        ) : moments.packingScene ? moments.packingScene : activeEncounter && currentEncounter ? (
          <EncounterScreen
            autoAdvanceEnabled={displaySettings.value.autoAdvance}
            readSkip={readLines}
            key={`${activeEncounter.runId}-${sceneEpoch}`}
            learning={learning}
            englishOff={englishOff}
            speed={speed}
            reduceMotion={displaySettings.value.reduceMotion}
            onSpeed={setSpeed}
            view={{
              id: `${currentEncounter.id}_${activeEncounter.phase}`,
              revision: game.revision,
              sceneId: currentEncounter.id,
              cityId: currentEncounter.cityId,
              // Who may stand on the scene's stage (scene-stage.ts): the scene's person with a figure (# person:) for
              // `# speaker: enemy`, else the generic stranger at the enemy's lines that show a feeling; the heroine from her
              // first line, her reaction or an emotion on the narration. How each of the two looks on this line.
              stage: (() => {
                const frame = activeEncounter.frame;
                const heroine = frame.reactions?.heroine;
                const enemy = frame.reactions?.enemy;
                const hasEmotion = frame.emotion !== "neutral" || !!frame.emotionExplicit;
                return {
                  line: stageLine(frame, storyState.people, {
                    heroine: !!heroine || (hasEmotion && frame.speaker === "narrator"),
                    enemy: !!enemy || (hasEmotion && frame.speaker === "enemy"),
                  }),
                  scene: sceneStageOf("encounter", encounterPerson?.characterId),
                  heroine: { emotion: heroine?.expression ?? (frame.speaker === "heroine" || frame.speaker === "narrator" ? frame.emotion : "neutral"), mark: heroine?.mark },
                  enemy: { emotion: enemy?.expression ?? (frame.speaker === "enemy" ? frame.emotion : "neutral"), mark: enemy?.mark },
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
              remembered: !!encounterPlate!.remembered,
              cutIn: nameCutIn(activeEncounter.frame,
                encounterPerson && { nameJa: encounterPerson.nameJa, ...(encounterPerson.titleJa ? { titleJa: encounterPerson.titleJa } : {}) },
                storyState.people),
              text: activeEncounter.frame.text,
              delivery: activeEncounter.frame.delivery,
              voiceId: activeEncounter.frame.voiceId,
              seId: activeEncounter.frame.seId,
              staging: activeEncounter.frame,
              itemOut: itemOutCard(game, activeEncounter.frame.itemOut),
              minute: game.travel.minute,
              phoneNames: { heroine: game.heroineName, player: game.playerName, enemy: encounterPerson?.nameJa },
              // Hidden choices (decision 43) are left out; the letters follow the shown ones.
              choices: activeEncounter.frame.choices.flatMap((choice) => {
                const option = encounterChoiceOption(currentEncounter, choice);
                const shown = encounterChoiceDisplay(game, choice.index);
                if (shown.show === "hidden") return [];
                return [{ index: choice.index, textEn: choice.text, translationJa: choice.translationJa ?? option?.translationJa ?? "", cost: shown.cost,
                  unavailableReason: shown.show === "grey" ? shown.reason : undefined, ...(shown.ap ? { apCost: shown.ap } : {}) }];
              }),
              ...(activeEncounter.frame.minigame ? { minigame: activeEncounter.frame.minigame } : {}),
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
            readAloud={readAloud && !englishOff}
            autoReadAloud={autoReadAloud && !englishOff}
            englishOff={englishOff}
            introHeld={moments.titleHolding}
            learning={learning}
            onEnglish={ENGLISH_NOTE_SHOWN ? openEnglish : undefined}
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
                {resultExitLabel(game) ?? "街歩きへ"} <span aria-hidden="true">→</span>
              </button>
            </section>
          </>
        ) : isJourneyComplete(game) ? (
          <>
            <CanalScene backgroundId={currentTravelPlace?.backgroundId} />
            <JourneyMemoriesScreen journeyJa={getJourney(journeyId)?.nameJa ?? ""} playerName={game.playerName} heroineName={game.heroineName}
              numbers={journeyNumbers(game, learnedWords.learned)} reduceMotion={displaySettings.value.reduceMotion}
              views={{ onEndRoll: moments.openEndRoll, onMusicRoom: () => setMusicRoom(true), onMiniGames: () => setMiniGamesOpen(true), onRecords: openRecords }}
              onAgain={openAgain}
              selector={!isDebug && onSwitchJourney ? <JourneySelection value={journeyId} onChange={requestJourneySwitch} /> : undefined} />
          </>
        ) : nightScreen && dayEnd ? (
          <NightScreen
            key={`${game.currentCityId}:${game.travel.day}`}
            game={game}
            buttons={nightButtons(game, dayEnd.actions, departure?.city.nameJa)}
            reduceMotion={displaySettings.value.reduceMotion}
            onAction={(kind) => {
              if (kind === "read_epilogue") {
                if (commit((state) => openOccasion(state, { kind: "epilogue" }, game.revision, nextRomanceRoll))) playSe("ui_confirm");
              }
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
            onEpilogue={() => commit((state) => openOccasion(state, { kind: "epilogue" }, game.revision, nextRomanceRoll))}
            onTravelEvent={(id, mode) => travelToEvent(id, mode, game.revision)}
            onRent={(modeId) => commit((state) => rentTransport(state, modeId, game.revision))}
            onBookTour={(tourId, offerId) => commit((state) => bookTour(state, tourId, offerId, game.revision))}
            onCancelTour={() => commit((state) => cancelTourBooking(state, game.revision))}
            onTravelWait={(minutes) => commit((state) => waitForTravel(state, minutes, game.revision))}
            onTravelSleep={(mode, viaPlaceId) => returnToHotel(mode, viaPlaceId, game.revision)}
            onBuyOutfit={(outfitId) => commit((state) => buyOutfit(state, outfitId, game.revision))}
            onWearOutfit={(outfitId) => wear(outfitId)}
            nextCityName={departure?.city.nameJa}
            onDepart={() => setConfirmDeparture(true)}
            seenCards={seenCards}
            debug={debugMarks}
          />
        )}
      </main>
      </MiniGameProvider>
      </NotebookCueContext.Provider>
      <footer>
        Dreamscape <span>·</span> 旅の余白に、ふたりの物語。
      </footer>
      {confirmDeparture && game && departure && <Modal labelledBy="departure-title" onClose={() => setConfirmDeparture(false)}>
        <ModalTitle id="departure-title">{departure.city.nameJa}へ出発</ModalTitle>
        <p>次の街へ進みます。この街でしか使えない未使用アイテムは、持って行けません。{game.travel.rentedModeIds.length > 0 &&
          `借りている${game.travel.rentedModeIds.map((modeId) => getTransportMode(game.currentCityId, modeId)?.nameJa ?? modeId).join("・")}は返します。`}</p>
        <DepartureLuggage {...departureLuggage(game)} />
        <ModalAnswers
          cancel={<button type="button" className="secondary" onClick={() => setConfirmDeparture(false)}>この街に残る</button>}
          action={<button type="button" className="primary" onClick={() => {
            if (commit((state) => openOccasion(state, { kind: "depart" }, game.revision, nextRomanceRoll))) {
              playSe("ui_confirm");
              setConfirmDeparture(false);
            }
          }}>出発する</button>} />
      </Modal>}
      {/* 旅の記録 (2026-11-19: 旅の記録 and アルバム made one; TravelLog.tsx). 旅の音楽室 (2026-11-13: once the first city is
          cleared), ミニゲーム集 beside it and the credit roll (the journey over; 2026-11-20) and the journey kept as 旅の思い出
          (2026-11-19) open over it and close back to it; 旅の数字 (2026-11-13) at its foot counts up as it opens. */}
      {recordsOpen && game && <LazyDialog onClose={() => setRecordsOpen(false)}>
        <TravelLogDialog game={game} onClose={() => setRecordsOpen(false)}
          missedPhotos={showsMissedPhotos(game, keptMemory?.status === "loaded")}
          extras={<>
            {(musicRoomOpen(game) || isJourneyComplete(game)) && <div className="records-extras">
              {musicRoomOpen(game) && <button type="button" className="secondary" data-testid="music-room-open"
                onClick={() => setMusicRoom(true)}>旅の音楽室</button>}
              {isJourneyComplete(game) && <button type="button" className="secondary" data-testid="minigame-collection-open"
                onClick={() => setMiniGamesOpen(true)}>ミニゲーム集</button>}
              {isJourneyComplete(game) && <button type="button" className="secondary" onClick={() => moments.openEndRoll()}>
                エンドロールを見る</button>}
            </div>}
            {keptMemory?.status === "loaded" && <button type="button" className="secondary records-kept" data-testid="kept-memory-open"
              onClick={() => setKeptOpen(true)}>前の旅の思い出</button>}
          </>}
          footer={<JourneyNumbersCard numbers={journeyNumbers(game, learnedWords.learned)} reduceMotion={displaySettings.value.reduceMotion} />} />
      </LazyDialog>}
      {keptOpen && keptGame && <Modal labelledBy="kept-memory-title" onClose={closeKept} closeOnBackdrop>
        <ModalTitle id="kept-memory-title" onClose={closeKept}>前の旅の思い出</ModalTitle>
        <KeptMemoryContents playerName={keptGame.playerName} heroineName={keptGame.heroineName}
          numbers={journeyNumbers(keptGame, learnedWords.learned)} reduceMotion={displaySettings.value.reduceMotion}
          views={{ onEndRoll: () => setKeptEndRoll(true), onMusicRoom: () => setMusicRoom(true), onMiniGames: () => setMiniGamesOpen(true),
            onRecords: () => setKeptLogOpen(true) }} />
      </Modal>}
      {keptEndRoll && keptGame && <EndRollDialog roll={endRollOf(keptGame)} numbers={journeyNumbers(keptGame, learnedWords.learned)}
        reduceMotion={displaySettings.value.reduceMotion} onClose={() => setKeptEndRoll(false)} />}
      {confirmAgain && game && <Modal labelledBy="again-title" onClose={() => setConfirmAgain(null)}>
        <ModalTitle id="again-title">もう一度この旅を</ModalTitle>
        <p>{game.playerName}と{game.heroineName}の名前で、{getJourney(journeyId)?.nameJa ?? "この旅行編"}を最初から始めます。進行・AP・旅行予算・品物・手がかり・ふたりの関係は、最初からになります。旅の記録の写真・旅の図鑑・旅のことばは、そのまま引き継ぎます。</p>
        <p>今の旅は「旅の思い出」として残り、新しい旅の「旅の記録」から見返せます。既読の記録も、そのまま残ります。
          {confirmAgain.status === "loaded" && "前に残した旅の思い出は、今の旅に置き換わります。"}
          {confirmAgain.status === "invalid" && confirmAgain.raw !== null && "前に残した旅の思い出は今の版では読み込めないため、今の旅に置き換わります。"}</p>
        <DifficultyFields value={againDifficulty} onChange={setAgainDifficulty} journeyId={journeyId} />
        {confirmAgain.status === "invalid" && confirmAgain.raw === null && <p role="alert">このブラウザの保存領域を読み取れないため、始められません。保存の設定を確認してください。</p>}
        <ModalAnswers
          cancel={<button type="button" className="secondary" autoFocus onClick={() => setConfirmAgain(null)}>戻る</button>}
          action={<button type="button" className="primary" data-testid="again-confirm"
            disabled={confirmAgain.status === "invalid" && confirmAgain.raw === null}
            onClick={() => beginAgain(confirmAgain.status === "empty" ? null : confirmAgain.raw, againDifficulty)}>最初から始める</button>} />
      </Modal>}
      {musicRoom && game && <LazyDialog onClose={() => { setMusicRoom(false); setRoomTrack(null); }}>
        <MusicRoom game={keptGame ?? game} isRead={readLines.isRead} playing={roomTrack} onPlay={setRoomTrack}
          bgmOn={displaySettings.value.bgm} voiceOn={displaySettings.value.voice}
          onClose={() => { setMusicRoom(false); setRoomTrack(null); }} />
      </LazyDialog>}
      {miniGamesOpen && game && <LazyDialog onClose={() => setMiniGamesOpen(false)}>
        <MiniGameCollection game={keptGame ?? game} play={collectionPlay} onClose={() => setMiniGamesOpen(false)} />
      </LazyDialog>}
      {keptLogOpen && keptGame && <LazyDialog onClose={() => setKeptLogOpen(false)}>
        <TravelLogDialog game={keptGame} missedPhotos={showsMissedPhotos(keptGame, true)} onClose={() => setKeptLogOpen(false)} />
      </LazyDialog>}

      {termCardShown && termCard && game &&
        <GlossaryTermWindow key={termCard.key} termIds={termCard.ids} quiet={termCard.quiet} onDone={() => setTermCard(null)} />}
      {screenCreditsOpen && <ScreenCredits scenePhoto={scenePhoto} photos={creditPhotos} factSources={explanationSources} onAllCredits={() => setCreditsOpen(true)}
        onClose={() => setScreenCreditsOpen(false)} />}
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
      {noteTab && game && notePages.length > 0 && <NoteDialog pages={notePages} tab={noteTab} onTab={openNotePage}
        game={game} learning={learning} learnedWords={learnedWords.learned} readAloud={readAloud}
        glossary={hasTerms ? { journeyId: glossaryJourneyId, met: metGlossary, newIds: glossaryNewIds, revealAll: debugMarks } : undefined}
        newPages={newNotePages} onClose={closeNote} />}
      {confirmLoad && <ConfirmDialog id="load-title" title="保存した場面を読み込みますか？" action="ロードする" settlePresses
        onCancel={() => setConfirmLoad(false)} onAction={() => { setConfirmLoad(false); loadSavedGame(); }}>
        <p>まだ保存していない進行は失われます。</p>
      </ConfirmDialog>}
      {/* Opened from the menu's panel, as ロード's confirmation: it takes no press for a moment (settlePresses). */}
      {confirmReturn && game && <ConfirmDialog id="free-time-return-title" eyebrow="Debug" title="移動画面に戻りますか？" cancel="やめる"
        action="戻る" settlePresses onCancel={() => setConfirmReturn(false)} onAction={returnToFreeTime}>
        <p>この出来事で変わったことは、すべて元に戻ります。</p>
      </ConfirmDialog>}
      {deleteSnapshot && <DeleteSaveDialog debug={isDebug} journeyJa={getJourney(journeyId)?.nameJa ?? "この旅行編"} slot={saves?.slot ?? 1}
        sharedKept={deleteSnapshot.sharedKept} offlineNote={offlineEntries ? offlineDeleteNote(offline) : undefined}
        onCancel={() => setDeleteSnapshot(null)}
        onConfirm={() => {
          if (!session.deleteConfirmed(deleteSnapshot, saveLoadOpenedAt !== null ? (text) => setSaveLoadNotice({ text, at: "delete" }) : undefined)) {
            setDeleteSnapshot(null);
            return;
          }
          window.location.reload();
        }} />}
      {saveLoadOpenedAt !== null && <SaveLoadDialog current={playedSlot} debug={isDebug}
        readSlots={() => saves ? slotSummaries(saves.base, journeyId) : [summarizeSlot(storage, journeyId, 1)]}
        autoSave={{ on: displaySettings.value.autoSave, disabled: !!displaySettings.error, onChange: setAutoSave,
          savedLine: autoSaveLine(session.savedAt, saveLoadOpenedAt) }}
        notice={saveLoadNotice} onSave={saveIntoSlot} onLoad={loadFromSlot} onDelete={requestDelete}
        more={<>
          {/* オフライン (2026-11-17): what this device keeps of the journeys, in one line (a status region that stays
              mounted; how far a run is shows beside it and is not announced), and the way into the dialog that does the rest. */}
          {offlineEntries && <>
            <p role="status" className="offline-summary" data-testid="offline-summary">
              {offlineLine.text}{offlineLine.live && <span className="offline-summary-live" aria-hidden="true">{offlineLine.live}</span>}
            </p>
            {offlineEntryShown && <div className="settings-data-links">
              <button type="button" className="text-button offline-entry" data-testid="offline-save-load-entry" onClick={() => setOfflineOpen(true)}>オフラインで遊ぶ</button>
            </div>}
          </>}
          {saveLoadOldData && <div className="settings-data-links">
            <button type="button" className="text-button old-data-entry" onClick={() => setOldDataOpen(true)}>古い保存データの整理</button>
          </div>}
          {/* Another journey (from ゲームの設定 until 2026-11-20): its slots are its own; set apart from the saved data by a thin rule. */}
          {!isDebug && onSwitchJourney && <div className="save-load-journey">
            <JourneySelection value={journeyId} onChange={requestJourneySwitch} />
          </div>}
        </>}
        onClose={() => setSaveLoadOpenedAt(null)} />}
      {switchSlotTo !== null && saves && <ConfirmDialog id="switch-slot-title" title={`セーブ${switchSlotTo}に切り替える`} action="切り替える"
        onCancel={() => setSwitchSlotTo(null)} onAction={() => saves.onSwitch(switchSlotTo)}>
        <p>手動セーブしていない進行は失われます。切り替えますか？</p>
      </ConfirmDialog>}
      {switchJourneyTo && <ConfirmDialog id="switch-journey-title" title="旅行編を切り替える" action="切り替える"
        onCancel={() => setSwitchJourneyTo(null)} onAction={() => onSwitchJourney?.(switchJourneyTo)}>
        <p>手動セーブしていない進行は失われます。切り替えますか？</p>
      </ConfirmDialog>}
      {settings && game && <SettingsDialog game={game} display={displaySettings} learning={learning}
        readAloudAvailable={readAloudAvailable} vibrationAvailable={vibrationAvailable}
        names={active || game.activeEncounter || game.activeBattle || game.activeTourism || game.activeEpilogue ? null : {
          player, heroine, onPlayer: setPlayer, onHeroine: setHeroine, playerRef: settingsReading.ref,
          onSave: () => {
            const reading = settingsReading.read(player.trim());
            commit((state) => setNames(state, player.trim(), heroine.trim(), reading));
            setSettings(false);
          },
        }}
        onEnglishLevel={(level) => commit((state) => setEnglishLevel(state, level))}
        creator={!isDebug || debugOn ? { open: debugOn, children: <>
          {!isDebug && <DebugModeSetting debugMode={debugMode} />}
          {/* 撮影の形 (Debug mode only), loaded when shown. */}
          {debugOn && <Suspense fallback={null}><DebugShotSetting on={shot.on} onChange={shot.change} message={shot.message} /></Suspense>}
          {/* 最初の3分の計測 (Debug mode only), loaded when shown. */}
          {debugOn && <Suspense fallback={null}><IntroTimingNote timing={introTiming.current} /></Suspense>}
          {/* 台詞の声の速さ (Debug mode only), loaded when shown. */}
          {debugOn && <Suspense fallback={null}>
            <DebugVoiceRate rate={voiceRate.rate} onChange={voiceRate.change} voiceOn={displaySettings.value.voice} message={voiceRate.message} />
          </Suspense>}
        </> } : undefined}
        onClose={() => setSettings(false)} />}
      {/* From the title, or over 「画面の出典」 (closing goes back to it, where it was). */}
      {creditsOpen && <LazyDialog onClose={() => setCreditsOpen(false)}><CreditsDialog onClose={() => setCreditsOpen(false)} /></LazyDialog>}
      {opening && <OpeningMovie key={opening.videoPath} src={`${import.meta.env.BASE_URL}${opening.videoPath}`}
        muted={!displaySettings.value.bgm} onEnd={() => {
          if (introTiming.current) introTiming.current = endIntroMovie(introTiming.current, performance.now());
          setOpening(null);
          startJourney(opening.player, opening.heroine, opening.reading, opening.difficulty, opening.again);
        }} />}
      {/* From the title's selector, or over セーブ・ロード (closing goes back to it, where it was). Closing never stops a run. */}
      {offlineOpen && <LazyDialog onClose={() => setOfflineOpen(false)}><OfflinePlayDialog onClose={() => setOfflineOpen(false)} journeys={journeys} /></LazyDialog>}
      {/* From the title's notice, or over セーブ・ロード (closing goes back to it, where it was). */}
      {oldDataOpen && oldDataStorage && <LazyDialog onClose={() => setOldDataOpen(false)}>
        <OldDataCleanup storage={oldDataStorage} context={oldDataContext(journeyId)} onClose={() => setOldDataOpen(false)} />
      </LazyDialog>}
      {travelEffects}
      {moments.overlays}
    </div>
    </WornCostumeContext.Provider>
  );
}
