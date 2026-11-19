import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
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
import { ConfirmActionButton } from "../components/ConfirmActionButton";
import { withNames } from "../features/romance/names";
import { BattleScreen } from "../features/battle/BattleScreen";
import { TourismScreen } from "../features/tourism/TourismScreen";
import { ClueNotebook } from "../features/tourism/ClueNotebook";
import { clueRecordedNotice } from "../features/tourism/clue-source";
import type { ClueNoticeWord } from "./ClueRecordedNotice";
import { useLearning } from "../features/learning/useLearning";
import { answeredQuestions, EnglishReview, latestAnsweredQuestionId, metQuestions } from "../features/learning/EnglishReview";
import { useLocalWords } from "../features/learning/useLocalWords";
import { LocalWordNotice } from "../features/learning/LocalWordNotice";
import { lineFrameOnScreen, lineWordsOnScreen } from "../features/learning/local-words";
import { readAloudSupported } from "../features/learning/read-aloud";
import { primeSpeechOnGesture } from "../features/learning/ReadAloud";
import { FreeTimeHub } from "../features/journey/FreeTimeHub";
import type { SeenCards } from "../features/journey/photo-cards";
import { nightButtons, NightScreen } from "../features/journey/NightScreen";
import { CityRecords } from "../features/journey/CityProgress";
import { MetPeople } from "../features/journey/MetPeople";
import { JourneyNumbersCard } from "../features/journey/JourneyNumbers";
import { musicRoomOpen } from "../features/journey/music-room";
import { journeyNumbers } from "../features/journey/journey-numbers";
import { freeTimePhotos, PhotoCredits, recapPhotos } from "../features/journey/PhotoCredits";
import { ALBUM_PHOTO_NOTICE_MS, AlbumPhotoNotice, FIRST_ALBUM_PHOTO_NOTICE_MS, type AlbumPhotoNoticeState } from "../features/journey/AlbumPhotoNotice";
import { OpeningMovie } from "../features/journey/OpeningMovie";
import { DepartureLuggage } from "../features/journey/JourneyMoments";
import { departureLuggage } from "../features/journey/journey-moments";
import { titleArtTint } from "../features/journey/time-of-day";
import { photoTaken } from "../domain/album";
import { metTerms, termsAdded, termsToShow } from "../domain/glossary";
import { GlossaryTermWindow } from "../features/journey/GlossaryTermWindow";
import { TitleNameFields } from "../features/journey/TitleNameFields";
import { DifficultyFields, EnglishLevelField } from "../features/journey/DifficultyFields";
import { DEFAULT_DIFFICULTY, difficultyOf, economyLevelLabel, type Difficulty } from "../domain/difficulty";
import { useNameReading } from "../features/journey/useNameReading";
import { nameOrDefault } from "../domain/player-names";
import { playerLatinName } from "../domain/name-romaji";
import { useTravelEffects } from "./useTravelEffects";
import { useJourneyMoments } from "./useJourneyMoments";
import { useItemShowLeave } from "./useItemShowLeave";
import { itemOutCard } from "../components/ItemOut";
import { JourneyHud } from "./JourneyHud";
import { hudView } from "./hud-view";
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

import { browserStorage, type AppProps } from "./app-storage";
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
const AlbumDialog = lazy(() => import("../features/journey/AlbumDialog").then((module) => ({ default: module.AlbumDialog })));
const GlossaryDialog = lazy(() => import("../features/journey/GlossaryDialog").then((module) => ({ default: module.GlossaryDialog })));

/** Where a Debug relationship change shows (decision 23): the story scene on screen, else the map or free time until the next action. */
function changeScreenKey(state: GameState): string {
  return storySceneOnScreen(state) ?? `screen:${state.revision}`;
}

/**
 * ゲームの設定's 「制作者向け」 (2026-11-14 user decision): Debug mode and its tools, folded away for players; open as
 * ゲームの設定 opens while Debug mode is on. It stays as the player leaves it while ゲームの設定 is open (turning Debug
 * mode off inside it does not fold it under the finger).
 */
function CreatorSettings({ initiallyOpen, children }: { initiallyOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  return <details className="settings-creator" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>制作者向け</summary>
    {children}
  </details>;
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
  // 「問題が出たら英語を自動で読み上げる」 (ReadAloud.tsx useAutoReadAloud, 2026-11-14): on, the page's next tap primes the
  // speech, so that a question can be read with no press (iOS Safari speaks with no gesture only after one).
  const autoReadAloud = readAloudAvailable && displaySettings.value.autoReadAloud;
  useEffect(() => (autoReadAloud ? primeSpeechOnGesture() : undefined), [autoReadAloud]);
  // Said once under the reading settings, below the first one turned on.
  const noEnglishVoiceJa = "英語の声がない端末では、読まないか、ほかの言葉の声で読みます。";
  // 「台詞の声を出す」 and 「声の大きさ」 for every line's `# voice:` (useVoice.ts).
  useVoiceSettings(displaySettings.value.voice, displaySettings.value.voiceVolume);
  const voicePercent = Math.round(displaySettings.value.voiceVolume * 100);
  // 「効果音を出す」 and 「効果音の大きさ」 for the game's sounds and every line's `# se:` (src/audio/sound-effects.ts).
  useSoundEffectSettings(displaySettings.value.se, displaySettings.value.seVolume);
  const sePercent = Math.round(displaySettings.value.seVolume * 100);
  // 「振動する」 (src/audio/vibration.ts): the setting only where the browser can vibrate.
  const [vibrationAvailable] = useState(() => canVibrate(typeof navigator === "undefined" ? undefined : navigator));
  useVibrationSetting(vibrationAvailable && displaySettings.value.vibration);
  // 「BGMを流す」 and 「BGMの大きさ」 for the background music (src/audio/bgm.ts).
  useBgmSettings(displaySettings.value.bgm, displaySettings.value.bgmVolume);
  const bgmPercent = Math.round(displaySettings.value.bgmVolume * 100);
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
  const [opening, setOpening] = useState<{ videoPath: string; player: string; heroine: string; reading?: string; difficulty: Difficulty } | null>(null);
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
  // The background loading (src/media/preload-ahead.ts): after each saved change, the pictures and voices of the lines
  // ahead; on the title, the new journey's arrival; nothing while the opening movie streams.
  usePreloadAhead(game, journeyId, !!opening);
  // 「オフラインで遊ぶ」 (2026-11-17; src/offline/): what this device keeps of the journeys, for the entries on the title and
  // in ゲームの設定 and the dialog they open. Not in Debug, nor on a page given another storage (a test's): the entries
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
  const [englishOpen, setEnglishOpen] = useState(
    () => !!learning.data.openQuestion,
  );
  // The question 英語ノート showed last in this tab (its memory only). Opened without a question named (the menu's
  // 「英語ノート」, a quiz result's), the note shows that one again while it is listed, else the question answered last,
  // never an empty 「問題を選んでください」 (2026-11-14 user decision).
  const lastEnglishQuestion = useRef<string | null>(null);
  useEffect(() => {
    if (learning.data.openQuestion) lastEnglishQuestion.current = learning.data.openQuestion;
  }, [learning.data.openQuestion]);
  function openEnglish(questionId?: string) {
    const last = lastEnglishQuestion.current;
    const listed = !!game && !!last && answeredQuestions(game, learning).some((entry) => entry.question.id === last);
    const shown = questionId ?? (listed ? last : game ? latestAnsweredQuestionId(game, learning) : null);
    learning.update((s) => ({
      ...s,
      openQuestion: shown,
      openTopic: null,
    }));
    setEnglishOpen(true);
  }
  const [deleteSnapshot, setDeleteSnapshot] = useState<DeleteSnapshot | null>(null);
  const [confirmDeparture, setConfirmDeparture] = useState(false);
  const [settings, setSettings] = useState(false);
  // What ゲームの設定 says about its own actions (2026-11-14): why automatic saving could not be turned on, under its
  // checkbox, or why the save data cannot be deleted, under 「保存データの消去」. Other words of the game stay on its page.
  const [settingsNotice, setSettingsNotice] = useState<{ text: string; at: "autosave" | "delete" } | null>(null);
  const [oldDataOpen, setOldDataOpen] = useState(false);
  // ゲームの設定's way into 「古い保存データの整理」: only when the list has something, as on the title (read as ゲームの
  // 設定 opens; the entry stays while it is open, where the cleanup gives the focus back, and the cleanup says so if it
  // has emptied the list since).
  const settingsOldData = useMemo(() => {
    if (!settings || isDebug || !oldDataStorage) return false;
    try { return readOldData(oldDataStorage, oldDataContext(journeyId)).items.length > 0; } catch { return false; }
  }, [settings, isDebug, oldDataStorage, journeyId]);
  // The title's way into 「古い保存データの整理」, beside its notice of a save it cannot open: only when the list has
  // something (read as the notice appears; the dialog says so if a cleanup has emptied it since).
  const titleOldData = useMemo(() => {
    if (game || !invalid || isDebug || !oldDataStorage) return false;
    try { return readOldData(oldDataStorage, oldDataContext(journeyId)).items.length > 0; } catch { return false; }
  }, [game, invalid, isDebug, oldDataStorage, journeyId]);
  const [creditsOpen, setCreditsOpen] = useState(false);
  // ゲームの設定's line under 「オフライン」; on the title, the same words for screen readers and a short mark on the entry
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
  function requestJourneySwitch(id: string) {
    if (!onSwitchJourney) return;
    const step = leaveStep({ way: "switch_journey", from: journeyId, to: id }, session.hasUnsavedProgress());
    // Its confirmation opens over ゲームの設定, whose 「戻る」 goes back to it (2026-11-14 user decision).
    if (step === "ask") setSwitchJourneyTo(id);
    else if (step === "leave") onSwitchJourney(id);
  }
  const [recordsOpen, setRecordsOpen] = useState(false);
  // 旅の音楽室 (MusicRoom.tsx): open, and the track it plays (the screen's own music again once it stops or closes).
  const [musicRoom, setMusicRoom] = useState(false);
  const [roomTrack, setRoomTrack] = useState<string | null>(null);
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
  // The title's difficulty for a new journey (2026-11-19).
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  // The reading of the player's name, captured as it is typed in the title's and the settings' forms (nothing shows it).
  const titleReading = useNameReading();
  const settingsReading = useNameReading(game?.playerNameReading);
  // The marks of what is new (seenMarks above): the memory starts from everything there is, and what the player opens is seen.
  // 英語ノート's entries, read again when an answer, a record or a word learned changes (the records' content is checked).
  const englishKey = useMemo(
    () => (game ? englishNoteKeys(metQuestions(game, learning), learnedWords.learned) : []).join("\n"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [!!game, game?.battleRecords, game?.activeBattle?.battleId, game?.activeBattle?.contentHash, game?.activeBattle?.answers, learning.data.records, learnedWords.learned],
  );
  const englishIds = englishKey ? englishKey.split("\n") : [];
  useEffect(() => {
    if (game && !seenMarks) setSeenMarks(seenAll({ items: heldItemIds(game.inventory), clues: game.discoveredClueIds, english: englishIds, glossary: metTerms(game) }));
  });
  useEffect(() => {
    if (notebook && game) setSeenMarks((marks) => marks && markSeen(marks, "clues", game.discoveredClueIds));
  }, [notebook, game]);
  useEffect(() => {
    if (englishOpen) setSeenMarks((marks) => marks && markSeen(marks, "english", englishIds));
  // The entries as a key: the list itself is made again at each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [englishOpen, englishKey]);
  const notebookCue = { gleam: clueGleam, unseen: !!game && unseenIds(seenMarks?.clues, game.discoveredClueIds).length > 0 };
  const englishNew = unseenIds(seenMarks?.english, englishIds).length > 0;
  // 旅の図鑑: in ≡メニュー for a journey that has terms; its dot while a term met in play has not been seen there. Opening it
  // shows 「NEW」 on those terms (as they were as it opened) and counts them as seen.
  // The journey of the game on screen (a Debug session opens any journey's scene).
  const glossaryJourneyId = (game && getJourneyForCity(game.currentCityId)?.id) ?? journeyId;
  const hasTerms = journeyTerms(glossaryJourneyId).length > 0;
  const metGlossary = game ? metTerms(game) : [];
  const glossaryNew = unseenIds(seenMarks?.glossary, metGlossary).length > 0;
  const [glossaryOpen, setGlossaryOpen] = useState<{ newIds: string[] } | null>(null);
  function openGlossary() {
    setGlossaryOpen({ newIds: unseenIds(seenMarks?.glossary, metGlossary) });
    setSeenMarks((marks) => marks && markSeen(marks, "glossary", metGlossary));
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
  function startJourney(playerName: string, heroineName: string, reading: string | undefined, chosen: Difficulty) {
    freeTimeReturn.current = null;
    seenCards.current = new Map();
    setSeenMarks(null);
    moments.restart(false);
    holdSceneCues(false);
    session.begin(playerName, heroineName, reading, journeyId, chosen);
  }
  /**
   * 保存データの消去 (ゲームの設定's, or the title's): its confirmation opens over ゲームの設定, whose 「消去せず戻る」 goes
   * back to it (2026-11-14 user decision); why it cannot be asked is said where it was asked.
   */
  function requestDelete() {
    setSettingsNotice(null);
    const snapshot = session.prepareDelete(settings ? (text) => setSettingsNotice({ text, at: "delete" }) : undefined);
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
    setSettingsNotice(null);
    if (enabled && !session.persistCurrent((text) => setSettingsNotice({ text, at: "autosave" }))) return;
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
  // Free time on show (its photos are in ≡メニュー's 「写真の出典」: creditPhotos below).
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
  // A new screen takes a lost focus on its visible heading (scene-focus.ts, UI redesign §3.7 E);
  // free time opens at the top of the page, not at the scroll position of the screen before it
  // (the title, scrolled to 「旅をはじめる」 on a short phone).
  const screen = nightScreen && game ? `night:${game.currentCityId}` : screenOnShow(game, { sceneEpoch, showRomanceEnding });
  // The title card, the recap, the packing and the credit roll (2026-11-11). A game opened on its save (not Debug) is resumed.
  const moments = useJourneyMoments({ game, screen, resumed: !isDebug && loaded.status === "loaded",
    reduceMotion: displaySettings.value.reduceMotion, effectPlaying: travelEffectPlaying, learnedWords: learnedWords.learned });
  momentsRef.current = moments.committed;
  // ≡メニュー's 「写真の出典」: the photos free time shows (the cards' and a backdrop photo's) and, in free time or on the night
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
  // ≡メニュー's 「画像の出典」 opens: a scene shows no 出典 of its own (user decision 2026-11-11).
  const photoOf = (id: string | undefined) => (id ? tourismAssets.find((asset) => asset.id === id) : undefined);
  const landmarkPhoto = (id: string | null | undefined) => photoOf(landmarks.find((landmark) => landmark.id === id)?.imageAssetId);
  const backdropPhoto = (backgroundId: string) => photoOf(presentation.backgrounds[backgroundId]?.imageAssetId);
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
  const scenePlaceJa = momentQuiz && currentBattle ? landmarks.find((landmark) => landmark.id === currentBattle.landmarkId)?.nameJa : undefined;
  const nameForm = (
    <>
      <label>
        主人公の名前
        <input
          ref={settingsReading.ref}
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
        clock={nightLeavingClock}
        place={currentTravelPlace}
        sceneBackgroundId={sceneBackgroundId}
        scenePlaceJa={scenePlaceJa}
        view={hudView(game)}
        onRecords={() => setRecordsOpen(true)}
        onAlbum={() => setAlbumOpen(true)}
        onGlossary={hasTerms ? openGlossary : undefined}
        onEnglish={() => openEnglish()}
        onPhotoCredits={creditPhotos.length ? () => setPhotoCreditsOpen(true) : undefined}
        onSceneCredits={scenePhoto ? () => setScenePhotoOpen(true) : undefined}
        onSave={() => {
          const saved = save();
          if (saved) playSe("save");
          return saved;
        }}
        autoSave={displaySettings.value.autoSave ? { savedAt: session.savedAt } : null}
        toast={session.toast}
        clueNotice={clueWords[0] ?? null}
        onClueNoticeDone={dropClueWord}
        replaced={replacedGame}
        seenItemIds={seenMarks?.items}
        onItemsSeen={(ids) => setSeenMarks((marks) => marks && markSeen(marks, "items", ids))}
        englishNew={englishNew}
        glossaryNew={glossaryNew}
        // 「…を手に入れました」 waits while the notices over a story scene show (one under the header at a time), and while a
        // line's item card (# item_show:, # item_out:) shows or flies into the bag.
        holdNotices={!!shownPhotoNotice || !!learnedWords.notice || !!lineItemId || !!itemLeave || !!lineItemOutId || !!itemOutLeave}
        itemFlight={itemLeave}
        itemOutFlight={itemOutLeave}
        onLoad={reload}
        onSettings={() => {
          setPlayer(game.playerName);
          setHeroine(game.heroineName);
          setSettingsNotice(null);
          // Another tab may have turned Debug mode on or off, or changed Debug's speed of the voices or 撮影の形, meanwhile.
          debugMode.refresh();
          voiceRate.refresh();
          shot.refresh();
          // What the device keeps for 「オフラインで遊ぶ」 may have changed too (a run that ended, another tab).
          if (offlineEntries) void refreshOffline();
          setSettings(true);
        }}
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
                    ? "ふたりの街歩き"
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
          <>
            <div className="intro-art" data-testid="title-art" data-time-of-day={titleTint.period}>
              <CanalScene compact artwork={getJourney(journeyId)?.titleArt} tint={titleTint.color ?? undefined} />
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
                そのあとは、ふたりで街歩き。
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
                  {titleOldData && <button type="button" className="text-button old-data-entry"
                    onClick={() => setOldDataOpen(true)}>古い保存データの整理</button>}
                </div>
              )}
              {/* The way into 「オフラインで遊ぶ」 sits beside the selector's caption (the title shows only without a game: a
                  player with a save finds it in ゲームの設定). */}
              {!isDebug && onSwitchJourney && <JourneySelection value={journeyId} onChange={requestJourneySwitch} restoreFocus={selectorFocus?.restoreFocus}
                aside={offlineEntries && offlineEntryShown ? <button type="button" className="text-button offline-entry" data-testid="offline-entry"
                  onClick={() => setOfflineOpen(true)}>オフラインで遊ぶ{offlineMark && `（${offlineMark}）`}</button> : undefined} />}
              {offlineEntries && offlineEntryShown && <p role="status" className="sr-only" data-testid="offline-title-status">{offlineTitleStatus(offline, journeys)?.text}</p>}
              {offlineEntries && offlineTitleHint(offline, online, journeyId) && <p className="fine-print offline-hint">{offlineTitleHint(offline, online, journeyId)}</p>}
              {titleActions.start !== "hidden" && <form onSubmit={begin} className="name-form">
                <TitleNameFields player={player} heroine={heroine} onPlayer={setPlayer} onHeroine={setHeroine}
                  playerRef={titleReading.ref} />
                <DifficultyFields value={difficulty} onChange={setDifficulty} />
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
                名前はあとから「メニュー」の「ゲームの設定」で変更できます。
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
            readAloud={readAloud}
            autoReadAloud={autoReadAloud}
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
                {resultExitLabel(game) ?? "街歩きへ"} <span aria-hidden="true">→</span>
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
      {recordsOpen && game && <Modal labelledBy="city-records-title" onClose={() => setRecordsOpen(false)} closeOnBackdrop>
        <ModalTitle id="city-records-title" onClose={() => setRecordsOpen(false)}>旅の記録</ModalTitle>
        <p className="records-travelers">
          <span data-testid="travelers">{game.playerName}<span className="amp"> と </span>{game.heroineName}</span>
          {game.endingReached && <span className="records-relationship">交際中</span>}
        </p>
        {/* 旅の音楽室 (2026-11-13: once the first city is cleared) and the credit roll (the journey over), side by side at the
            top (2026-11-14), each opening over 旅の記録 and closing back to it where it was. */}
        {(musicRoomOpen(game) || isJourneyComplete(game)) && <div className="records-extras">
          {musicRoomOpen(game) && <button type="button" className="secondary" data-testid="music-room-open"
            onClick={() => setMusicRoom(true)}>旅の音楽室</button>}
          {isJourneyComplete(game) && <button type="button" className="secondary" onClick={() => moments.openEndRoll()}>
            エンドロールを見る</button>}
        </div>}
        <CityRecords game={game} />
        {/* 旅の数字 (2026-11-13): the journey so far in a few numbers, counting up as the records open. */}
        <JourneyNumbersCard numbers={journeyNumbers(game, learnedWords.learned)} reduceMotion={displaySettings.value.reduceMotion} />
        <MetPeople game={game} />
      </Modal>}
      {musicRoom && game && <LazyDialog onClose={() => { setMusicRoom(false); setRoomTrack(null); }}>
        <MusicRoom game={game} isRead={readLines.isRead} playing={roomTrack} onPlay={setRoomTrack}
          bgmOn={displaySettings.value.bgm} voiceOn={displaySettings.value.voice}
          onClose={() => { setMusicRoom(false); setRoomTrack(null); }} />
      </LazyDialog>}
      {albumOpen && game && <LazyDialog onClose={() => setAlbumOpen(false)}>
        <AlbumDialog album={game.album} currentCityId={game.currentCityId} onClose={() => setAlbumOpen(false)} />
      </LazyDialog>}
      {glossaryOpen && game && <LazyDialog onClose={() => setGlossaryOpen(null)}>
        <GlossaryDialog journeyId={glossaryJourneyId} met={metGlossary} newIds={glossaryOpen.newIds} revealAll={debugMarks} onClose={() => setGlossaryOpen(null)} />
      </LazyDialog>}
      {termCardShown && termCard && game &&
        <GlossaryTermWindow key={termCard.key} termIds={termCard.ids} quiet={termCard.quiet} onDone={() => setTermCard(null)} />}
      {photoCreditsOpen && creditPhotos.length > 0 && <PhotoCredits photos={creditPhotos} onClose={() => setPhotoCreditsOpen(false)} />}
      {scenePhotoOpen && scenePhoto && <BackgroundCredits asset={scenePhoto} onClose={() => setScenePhotoOpen(false)} />}
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
          <ModalAnswers
            cancel={<button type="button" className="secondary" autoFocus onClick={() => setConfirmLoad(false)}>戻る</button>}
            action={<button type="button" className="primary" onClick={() => { setConfirmLoad(false); loadSavedGame(); }}>ロードする</button>} />
        </Modal>
      )}
      {/* Opened from the menu's panel, as ロード's confirmation: it takes no press for a moment (settlePresses). */}
      {confirmReturn && game && (
        <Modal labelledBy="free-time-return-title" onClose={() => setConfirmReturn(false)} settlePresses>
          <ModalTitle id="free-time-return-title" eyebrow="Debug">移動画面に戻りますか？</ModalTitle>
          <p>この出来事で変わったことは、すべて元に戻ります。</p>
          <ModalAnswers
            cancel={<button type="button" className="secondary" autoFocus onClick={() => setConfirmReturn(false)}>やめる</button>}
            action={<button type="button" className="primary" onClick={returnToFreeTime}>戻る</button>} />
        </Modal>
      )}
      {deleteSnapshot && (
        <Modal
          labelledBy="delete-title"
          onClose={() => setDeleteSnapshot(null)}
        >
          <ModalTitle id="delete-title">{isDebug ? "Debug用の一時データを消去しますか？" : "保存データを消去しますか？"}</ModalTitle>
          {isDebug ? <p>Debug用の進行と英語ノートを消去して、Debugで開いた場面を最初から開き直します。通常のセーブ・英語ノート・表示設定は消去しません。</p> : <><p>
            このブラウザに保存された{getJourney(journeyId)?.nameJa ?? "この旅行編"}の名前、旅の進行、AP、恋愛・クイズの記録、アルバム、英語ノート（単語帳・その国の言葉）と対訳設定、既読の記録を消去します。元には戻せません。
          </p>
          <p className="fine-print">
            文字の速さなどの表示設定、以前に退避したバックアップ、ほかのサイトのデータは消去しません。ほかの旅行編の保存データ、ほかの端末やブラウザにも影響しません。
            {offlineEntries && offlineDeleteNote(offline)}
          </p></>}
          <ModalAnswers
            cancel={<button type="button" className="secondary" autoFocus onClick={() => setDeleteSnapshot(null)}>消去せず戻る</button>}
            action={<ConfirmActionButton
              className="danger-button"
              onClick={() => {
                if (!session.deleteConfirmed(deleteSnapshot, settings ? (text) => setSettingsNotice({ text, at: "delete" }) : undefined)) {
                  setDeleteSnapshot(null);
                  return;
                }
                window.location.reload();
              }}
            >
              {isDebug ? "Debug用の一時データを消去する" : "保存データを消去する"}
            </ConfirmActionButton>} />
        </Modal>
      )}
      {switchJourneyTo && (
        <Modal labelledBy="switch-journey-title" onClose={() => setSwitchJourneyTo(null)}>
          <ModalTitle id="switch-journey-title">旅行編を切り替える</ModalTitle>
          <p>手動セーブしていない進行は失われます。切り替えますか？</p>
          <ModalAnswers
            cancel={<button type="button" className="secondary" autoFocus onClick={() => setSwitchJourneyTo(null)}>戻る</button>}
            action={<button type="button" className="primary" onClick={() => onSwitchJourney?.(switchJourneyTo)}>切り替える</button>} />
        </Modal>
      )}
      {/* ゲームの設定 (2026-11-14 user decision): its groups under their headings, the most used first (文字と表示, 音と振動,
          難易度, 名前, データ, オフライン), and the creator's tools last, folded away (open while Debug mode is on). The first focus is the
          title bar's 「× 閉じる」 (the first control). What it opens (the credits, the old data, a deletion's or a journey
          switch's confirmation) stacks over it and closes back to it. A form is in it: a tap beside it does not close it. */}
      {settings && game && (
        <Modal labelledBy="settings-title" onClose={() => setSettings(false)} settlePresses>
          <ModalTitle id="settings-title" onClose={() => setSettings(false)}>ゲームの設定</ModalTitle>
          <h3>文字と表示</h3>
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
          <label className="translation-setting">
            <input type="checkbox" checked={displaySettings.value.miniGameAuto} disabled={!!displaySettings.error}
              onChange={(event) => displaySettings.update({ miniGameAuto: event.target.checked })} /> ミニゲームをおまかせにする
          </label>
          {displaySettings.value.miniGameAuto && <p className="fine-print">ミニゲームは押さずに自動で進み、場面ごとに決まった結果になります。</p>}
          {readAloudAvailable && <label className="translation-setting">
            <input type="checkbox" checked={displaySettings.value.autoReadAloud} disabled={!!displaySettings.error}
              onChange={(event) => displaySettings.update({ autoReadAloud: event.target.checked })} /> 問題が出たら英語を自動で読み上げる
          </label>}
          {autoReadAloud && <p className="fine-print">クイズの問題文を、出たときに一度読みます。答えると止まります。{noEnglishVoiceJa}</p>}
          {readAloudAvailable && <label className="translation-setting">
            <input type="checkbox" checked={displaySettings.value.readAloud} disabled={!!displaySettings.error}
              onChange={(event) => displaySettings.update({ readAloud: event.target.checked })} /> 英語を読み上げるボタンを出す
          </label>}
          {readAloud && <p className="fine-print">クイズと英語ノートの英文の横に出ます。{autoReadAloud ? "" : noEnglishVoiceJa}</p>}
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
          {/* The voices, the sound effects and the music together, each with its own volume (shown while it is on), and
              the vibration where the browser can vibrate. */}
          <h3>{vibrationAvailable ? "音と振動" : "音"}</h3>
          <label className="translation-setting">
            <input type="checkbox" checked={displaySettings.value.voice} disabled={!!displaySettings.error}
              onChange={(event) => displaySettings.update({ voice: event.target.checked })} /> 台詞の声を出す
          </label>
          {displaySettings.value.voice && <label className="translation-setting volume-setting">
            声の大きさ
            <input type="range" aria-label="声の大きさ" aria-valuetext={`${voicePercent}%`} min={0} max={100} step={10}
              value={voicePercent} disabled={!!displaySettings.error}
              onChange={(event) => displaySettings.update({ voiceVolume: Number(event.target.value) / 100 })} />
            <span className="volume-value" aria-hidden="true">{voicePercent}%</span>
          </label>}
          <label className="translation-setting">
            <input type="checkbox" checked={displaySettings.value.se} disabled={!!displaySettings.error}
              onChange={(event) => displaySettings.update({ se: event.target.checked })} /> 効果音を出す
          </label>
          {displaySettings.value.se && <label className="translation-setting volume-setting">
            効果音の大きさ
            <input type="range" aria-label="効果音の大きさ" aria-valuetext={`${sePercent}%`} min={0} max={100} step={10}
              value={sePercent} disabled={!!displaySettings.error}
              onChange={(event) => displaySettings.update({ seVolume: Number(event.target.value) / 100 })} />
            <span className="volume-value" aria-hidden="true">{sePercent}%</span>
          </label>}
          <label className="translation-setting">
            <input type="checkbox" checked={displaySettings.value.bgm} disabled={!!displaySettings.error}
              onChange={(event) => displaySettings.update({ bgm: event.target.checked })} /> BGMを流す
          </label>
          {displaySettings.value.bgm && <label className="translation-setting volume-setting">
            BGMの大きさ
            <input type="range" aria-label="BGMの大きさ" aria-valuetext={`${bgmPercent}%`} min={0} max={100} step={10}
              value={bgmPercent} disabled={!!displaySettings.error}
              onChange={(event) => displaySettings.update({ bgmVolume: Number(event.target.value) / 100 })} />
            <span className="volume-value" aria-hidden="true">{bgmPercent}%</span>
          </label>}
          <label className="translation-setting">
            <input type="checkbox" checked={displaySettings.value.ambience} disabled={!!displaySettings.error}
              onChange={(event) => displaySettings.update({ ambience: event.target.checked })} /> 環境音を流す
          </label>
          {displaySettings.value.ambience && <p className="fine-print">場所の音（雨・市場・鳥の声など）を、BGMの半分の大きさで流します。</p>}
          {vibrationAvailable && <label className="translation-setting">
            <input type="checkbox" checked={displaySettings.value.vibration} disabled={!!displaySettings.error}
              onChange={(event) => displaySettings.update({ vibration: event.target.checked })} /> 振動する
          </label>}
          {vibrationAvailable && displaySettings.value.vibration && <p className="fine-print">品物や手がかりを手に入れたときに、端末が短く震えます。</p>}
          {displaySettings.error && (
            <p role="status">{displaySettings.error}</p>
          )}
          {/* The difficulty (2026-11-19): the English changes from the next quiz (one already started keeps its own); how tight
              money and AP are was chosen at the title and stays for the journey. */}
          <h3>難易度</h3>
          <div className="name-form difficulty-settings">
            <EnglishLevelField value={difficultyOf(game).english}
              note={game.activeBattle ? "解いている途中のクイズは、始めたときの英語のまま進みます。" : "次のクイズから変わります。"}
              onChange={(level) => commit((state) => setEnglishLevel(state, level))} />
          </div>
          <p className="fine-print">お金とAPのきびしさ：{economyLevelLabel(difficultyOf(game).economy).labelJa}（旅の始めに決めたもので、変えられません）</p>
          <h3>名前</h3>
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
                  const reading = settingsReading.read(player.trim());
                  commit((state) =>
                    setNames(state, player.trim(), heroine.trim(), reading),
                  );
                  setSettings(false);
                }
              }}
            >
              {nameForm}
              <button
                className="secondary"
                disabled={!player.trim() || !heroine.trim()}
              >
                名前を保存
              </button>
            </form>
          )}
          <h3>データ</h3>
          <label className="translation-setting">
            <input type="checkbox" checked={displaySettings.value.autoSave} disabled={!!displaySettings.error}
              onChange={(event) => setAutoSave(event.target.checked)} /> ゲームの進行を自動保存する
          </label>
          {!displaySettings.value.autoSave && <p className="fine-print">オフの間は「セーブ」で進行を保存してください。</p>}
          {settingsNotice?.at === "autosave" && <p role="status">{settingsNotice.text}</p>}
          {!isDebug && onSwitchJourney && <JourneySelection value={journeyId} onChange={requestJourneySwitch} />}
          <div className="settings-data-links">
            <button type="button" className="text-button credits-entry" onClick={() => setCreditsOpen(true)}>出典・権利の一覧</button>
            {settingsOldData && <button type="button" className="text-button old-data-entry"
              onClick={() => setOldDataOpen(true)}>古い保存データの整理</button>}
            <button type="button" className="text-button delete-entry" onClick={requestDelete}>
              {isDebug ? "Debug用の一時データの消去" : "保存データの消去"}
            </button>
          </div>
          {settingsNotice?.at === "delete" && <p role="status">{settingsNotice.text}</p>}
          {/* 「オフライン」 (2026-11-17): what this device keeps of the journeys, in one line (a status region that stays
              mounted; how far a run is shows beside it and is not announced), and the way into the dialog that does the rest. */}
          {offlineEntries && <>
            <h3>オフライン</h3>
            <p role="status" className="offline-summary" data-testid="offline-summary">
              {offlineLine.text}{offlineLine.live && <span className="offline-summary-live" aria-hidden="true">{offlineLine.live}</span>}
            </p>
            {offlineEntryShown && <div className="settings-data-links">
              <button type="button" className="text-button offline-entry" data-testid="offline-settings-entry" onClick={() => setOfflineOpen(true)}>オフラインで遊ぶ</button>
            </div>}
          </>}
          {(!isDebug || debugOn) && <CreatorSettings initiallyOpen={debugOn}>
            {!isDebug && <DebugModeSetting debugMode={debugMode} />}
            {/* 撮影の形 (Debug mode only), loaded when shown. */}
            {debugOn && <Suspense fallback={null}><DebugShotSetting on={shot.on} onChange={shot.change} message={shot.message} /></Suspense>}
            {/* 最初の3分の計測 (Debug mode only), loaded when shown. */}
            {debugOn && <Suspense fallback={null}><IntroTimingNote timing={introTiming.current} /></Suspense>}
            {/* 台詞の声の速さ (Debug mode only), loaded when shown. */}
            {debugOn && <Suspense fallback={null}>
              <DebugVoiceRate rate={voiceRate.rate} onChange={voiceRate.change} voiceOn={displaySettings.value.voice} message={voiceRate.message} />
            </Suspense>}
          </CreatorSettings>}
        </Modal>
      )}
      {/* From the title, or over ゲームの設定 (closing goes back to it, where it was). */}
      {creditsOpen && <LazyDialog onClose={() => setCreditsOpen(false)}><CreditsDialog onClose={() => setCreditsOpen(false)} /></LazyDialog>}
      {opening && <OpeningMovie key={opening.videoPath} src={`${import.meta.env.BASE_URL}${opening.videoPath}`}
        muted={!displaySettings.value.bgm} onEnd={() => {
          if (introTiming.current) introTiming.current = endIntroMovie(introTiming.current, performance.now());
          setOpening(null);
          startJourney(opening.player, opening.heroine, opening.reading, opening.difficulty);
        }} />}
      {/* From the title's selector, or over ゲームの設定 (closing goes back to it, where it was). Closing never stops a run. */}
      {offlineOpen && <LazyDialog onClose={() => setOfflineOpen(false)}><OfflinePlayDialog onClose={() => setOfflineOpen(false)} journeys={journeys} /></LazyDialog>}
      {/* From the title's notice, or over ゲームの設定 (closing goes back to it, where it was). */}
      {oldDataOpen && oldDataStorage && <LazyDialog onClose={() => setOldDataOpen(false)}>
        <OldDataCleanup storage={oldDataStorage} context={oldDataContext(journeyId)} onClose={() => setOldDataOpen(false)} />
      </LazyDialog>}
      {travelEffects}
      {moments.overlays}
    </div>
  );
}
