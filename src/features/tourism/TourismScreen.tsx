import { useEffect, useRef, useState } from "react";
import { tourSceneBadge } from "../../domain/tour";
import {
  landmarks,
  tourismAssets,
  tourismClues,
  dialogueExpressions,
  dialogueReactions,
  storyState,
} from "../../content";
import { resolveDialogueExpression } from "../../content/dialogue-expressions";
import { resolveDialogueReaction } from "../../content/dialogue-reactions";
import { activeGuideStoryId, observationHotspots } from "../../domain/tourism";
import type { GameState } from "../../domain/game";
import { DIALOGUE_WINDOW_ATTRIBUTE, DialogueText } from "../../components/DialogueText";
import { LineStage, RecallLayer } from "../../components/LineStage";
import { lineSpeed, showsSpeakerPlate } from "../../components/line-staging";
import { CanalScene } from "../../components/CanalScene";
import { CharacterPortrait } from "../../components/CharacterPortrait";
import { portraitFocus } from "../../components/speaker-focus";
import { speakerPlate } from "../../components/speaker-plate";
import { ComicEffect } from "../../components/ComicEffect";
import { useDialogueLog } from "../../components/DialogueLog";
import { useDialogueScrollReset } from "../../components/useDialogueScrollReset";
import { useAutoAdvance } from "../../components/useAutoAdvance";
import { readLineId, type ReadSkip } from "../../components/read-skip";
import { DialogueControls, DialogueWindowHead } from "../../components/DialogueControls";
import { SceneChoices, type SceneChoiceView } from "../../components/SceneChoices";
import { Icon } from "../../components/icons";
import { dialogueObstructed } from "../../components/dialogueObstructed";
import { DialogueWindowRestore, useDialogueWindow } from "../../components/DialogueWindowVisibility";
import { SceneHeading, SceneNotebookTool } from "../../components/SceneHeading";
import { useSceneTap } from "../../components/useSceneTap";
import { ObservationViewer } from "./ObservationViewer";
import { ClueDetails } from "./ClueDetails";
import "./tourism.css";

const COMPACT_OBSERVATION = "(max-width: 600px) and (min-height: 500px)";

interface Props {
  game: GameState;
  speed: number;
  reduceMotion: boolean;
  onSpeed: (speed: number) => void;
  onAdvance: () => void;
  onSkip: () => void;
  onDiscover: (id: string) => boolean;
  onNotebook: () => void;
  onBattle: () => void;
  onReplayGuide: () => void;
  autoAdvanceEnabled?: boolean;
  /** This device's read lines: 高速送り stops at a line not read before (read-skip.ts). */
  readSkip?: ReadSkip;
  /** The guide's shown choices (stage 3a; hidden ones are left out by the caller) and choosing one. */
  guideChoices?: SceneChoiceView[];
  onChooseGuide?: (index: number) => void;
}

export function TourismScreen({
  game,
  speed,
  reduceMotion,
  autoAdvanceEnabled = false,
  readSkip,
  onAdvance,
  onSkip,
  onDiscover,
  onNotebook,
  onBattle,
  onReplayGuide,
  guideChoices = [],
  onChooseGuide,
}: Props) {
  const active = game.activeTourism!;
  const windowVisibility = useDialogueWindow();
  const dialogueRef = useDialogueScrollReset<HTMLDivElement>(active.storyState);
  const landmark = landmarks.find((item) => item.id === active.landmarkId)!;
  const asset = tourismAssets.find(
    (item) => item.id === landmark.imageAssetId,
  )!;
  const clues = landmark.clueIds.map((id) =>
    tourismClues.find((item) => item.id === id)!,
  );
  const points = observationHotspots(landmark.id)
    .map((clue) => ({
      id: clue.id,
      titleJa: clue.titleJa,
      region: clue.region!,
    }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [compactObservation, setCompactObservation] = useState(
    () => window.matchMedia(COMPACT_OBSERVATION).matches,
  );
  const [focusRequest, setFocusRequest] = useState(0);
  const shouldScrollToSelection = useRef(true);
  const selected = clues.find((clue) => clue.id === selectedId);
  const frame = active.frame;
  const guideStoryId = activeGuideStoryId(active) ?? landmark.guideStoryId ?? "";
  const reaction = frame && active.phase === "guide"
    ? resolveDialogueReaction(dialogueReactions, guideStoryId, frame, "heroine")
    : undefined;
  const plate = speakerPlate(frame ?? { speaker: "narrator" }, { heroine: game.heroineName, player: game.playerName }, storyState.people);
  const speaker = plate.name;
  const { ready, onReady, entries } = useDialogueLog(
    `${active.landmarkId}:${active.phase}`,
    game.revision,
    speaker,
    frame?.text ?? "",
  );
  const advanceSafely = () => {
    if (ready && !windowVisibility.hidden && !dialogueObstructed()) onAdvance();
  };
  const autoAdvance = useAutoAdvance({
    ready,
    canAdvance: active.phase === "guide" && !!frame && !frame.ended && !frame.choices.length && !windowVisibility.hidden,
    text: frame?.text ?? "",
    onAdvance: advanceSafely,
    defaultEnabled: autoAdvanceEnabled,
    readSkip,
    lineId: active.phase === "guide" && frame?.text ? readLineId(guideStoryId || active.landmarkId, frame.text) : null,
  });
  const sceneTap = useSceneTap({ active: active.phase === "guide" && !!frame, lineShown: ready, choicesShown: !!frame?.choices.length, windowHidden: windowVisibility.hidden });
  useEffect(() => {
    const media = window.matchMedia(COMPACT_OBSERVATION);
    const update = () => setCompactObservation(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    document
      .getElementById("tourism-screen")
      ?.scrollIntoView({ block: "start" });
  }, [active.landmarkId]);

  useEffect(() => {
    if (!focusRequest || !shouldScrollToSelection.current || compactObservation) return;
    document
      .querySelector('[data-testid="observation-viewport"]')
      ?.scrollIntoView({ block: "start" });
  }, [focusRequest, selected?.kind, compactObservation]);

  useEffect(() => {
    if (!detailOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]"))
        setDetailOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailOpen]);

  function selectClue(id: string, movePage = true) {
    if (onDiscover(id)) {
      // A marker is already in view; centering it must not also jump the page.
      shouldScrollToSelection.current = movePage;
      setSelectedId(id);
      setDetailOpen(true);
      setFocusRequest((value) => value + 1);
    }
  }


  return (
    <section
      className={`tourism-screen${active.phase === "guide" ? " guide-active" : ""}`}
      id="tourism-screen"
      data-testid="tourism-screen"
      {...sceneTap.props}
    >
      {active.phase === "guide" && <>
        <SceneHeading label={landmark.nameJa} badge={tourSceneBadge(game)} />
        <SceneNotebookTool onClick={onNotebook} />
      </>}
      {asset.isPlaceholder && (
        <p className="image-placeholder-note">
          仮画像です。実物の細部を再現した資料ではありません。
        </p>
      )}
      {active.phase === "guide" && frame ? (
        <div className="vn-scene tourism-guide-scene" data-dialogue-hidden={windowVisibility.hidden || undefined} data-quiet={frame.quiet}>
          <div className="vn-background" data-testid="scene-picture">
            <CanalScene backgroundId={frame.background} imageAssetId={landmark.imageAssetId} />
          </div>
          <RecallLayer imageId={frame.recall} />
          <span className="sr-only">{asset.altJa}</span>
          <div className="vn-character-layer">
            <CharacterPortrait
              characterId="heroine"
              sceneId={landmark.id}
              cityId={landmark.cityId}
              emotion={reaction?.expression ?? resolveDialogueExpression(dialogueExpressions, guideStoryId, frame)}
              focus={portraitFocus(frame.speaker, "heroine")}
              stand={frame.stand}
            >
              {reaction?.mark && <ComicEffect effect={reaction.mark} reduceMotion={reduceMotion} cueKey={active.storyState ?? undefined} />}
            </CharacterPortrait>
          </div>
          <div
            className="tourism-guide paper vn-dialogue"
            {...{ [DIALOGUE_WINDOW_ATTRIBUTE]: "" }}
            data-testid="tourism-guide"
            inert={windowVisibility.hidden}
            aria-hidden={windowVisibility.hidden || undefined}
          >
            <DialogueWindowHead
              speaker={showsSpeakerPlate(frame) && speaker}
              narration={plate.narration}
              controls={<DialogueControls close={<button type="button" className="text-button" data-testid="tourism-skip" aria-label="観光案内を閉じる" onClick={onSkip}><Icon name="close" />閉じる</button>} entries={entries} auto={autoAdvance} />}
            />
            <div ref={dialogueRef} className="vn-window-body">
            <LineStage frame={frame} names={{ heroine: game.heroineName, player: game.playerName }} compact={frame.choices.length > 0}>
              <DialogueText
                key={game.revision}
                ref={sceneTap.line}
                text={frame.text}
                delivery={frame.delivery}
                speed={autoAdvance.fast ? 0 : lineSpeed(speed, frame)}
                onReady={onReady}
                onAdvance={advanceSafely}
              />
            </LineStage>
            {frame.choices.length > 0 && onChooseGuide && <SceneChoices choices={guideChoices} disabled={!ready} onChoose={onChooseGuide} testId="guide-choice" />}
            {frame.ended && <button
              className="next"
              data-testid="tourism-advance"
              disabled={!ready}
              onClick={advanceSafely}
            >
              観察を始める
              <span aria-hidden="true"> →</span>
            </button>}
            </div>
          </div>
          <DialogueWindowRestore state={windowVisibility} />
        </div>
      ) : (
        <div className="tourism-observation">
          <ObservationViewer
            asset={asset}
            points={points}
            discoveredIds={game.discoveredClueIds}
            selectedId={selectedId}
            focusRequest={focusRequest}
            landmarkName={landmark.nameJa}
            onNotebook={onNotebook}
            onProceed={onBattle}
            onSelect={(id) => selectClue(id, false)}
          />
          {selected && detailOpen && (
            <article
              className="discovery-detail observation-detail"
              data-testid="discovery-detail"
              aria-live="polite"
            >
              <span className="sr-only">手がかり帳に記録しました。</span>
              <ClueDetails clue={selected} action={
                <button type="button" className="text-button" onClick={() => setDetailOpen(false)}>
                  説明を閉じる
                </button>
              } />
            </article>
          )}
          <details className="tourism-credits">
            <summary>画像の出典と利用条件</summary>
            <p>{asset.creditJa}</p>
            <p>{asset.modificationJa}</p>
            <p><a href={asset.sourceUrl} target="_blank" rel="noreferrer">画像の出典</a> · <a href={asset.licenseUrl} target="_blank" rel="noreferrer">{asset.licenseName}</a></p>
            {landmark.guideStoryId && <button className="text-button" data-testid="guide-replay" onClick={onReplayGuide}>観光案内をもう一度読む</button>}
          </details>
        </div>
      )}
    </section>
  );
}
