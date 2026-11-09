import { useEffect, useRef, useState } from "react";
import {
  landmarks,
  tourismAssets,
  tourismClues,
  dialogueExpressions,
  dialogueReactions,
} from "../../content";
import { resolveDialogueExpression } from "../../content/dialogue-expressions";
import { resolveDialogueReaction } from "../../content/dialogue-reactions";
import { activeGuideStoryId, observationHotspots } from "../../domain/tourism";
import type { GameState } from "../../domain/game";
import { DialogueText } from "../../components/DialogueText";
import { CanalScene } from "../../components/CanalScene";
import { CharacterPortrait } from "../../components/CharacterPortrait";
import { ComicEffect } from "../../components/ComicEffect";
import { useDialogueLog } from "../../components/DialogueLog";
import { useDialogueScrollReset } from "../../components/useDialogueScrollReset";
import { useAutoAdvance } from "../../components/useAutoAdvance";
import { DialogueControls } from "../../components/DialogueControls";
import { dialogueObstructed } from "../../components/dialogueObstructed";
import { DialogueWindowRestore, useDialogueWindow } from "../../components/DialogueWindowVisibility";
import { BackgroundCredits } from "../../components/BackgroundCredits";
import { SceneCreditButton, SceneLabelLine, SceneNotebookTab } from "../../components/SceneLabelLine";
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
}

export function TourismScreen({
  game,
  speed,
  reduceMotion,
  autoAdvanceEnabled = false,
  onAdvance,
  onSkip,
  onDiscover,
  onNotebook,
  onBattle,
  onReplayGuide,
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
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [compactObservation, setCompactObservation] = useState(
    () => window.matchMedia(COMPACT_OBSERVATION).matches,
  );
  const [focusRequest, setFocusRequest] = useState(0);
  const shouldScrollToSelection = useRef(true);
  const selected = clues.find((clue) => clue.id === selectedId);
  const frame = active.frame;
  const guideStoryId = activeGuideStoryId(active) ?? landmark.guideStoryId;
  const reaction = frame && active.phase === "guide"
    ? resolveDialogueReaction(dialogueReactions, guideStoryId, frame, "heroine")
    : undefined;
  const speaker =
    frame?.speaker === "heroine"
      ? game.heroineName
      : frame?.speaker === "player"
        ? game.playerName
        : "旅の風景";
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
    canAdvance: active.phase === "guide" && !!frame && !frame.ended && !windowVisibility.hidden,
    text: frame?.text ?? "",
    onAdvance: advanceSafely,
    defaultEnabled: autoAdvanceEnabled,
  });
  const sceneTap = useSceneTap({ active: active.phase === "guide" && !!frame, lineShown: ready, choicesShown: false, windowHidden: windowVisibility.hidden });
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
      {active.phase === "guide" && <SceneLabelLine label={landmark.nameJa}>
        <SceneCreditButton onClick={() => setCreditsOpen(true)} />
        <SceneNotebookTab onClick={onNotebook} />
      </SceneLabelLine>}
      {asset.isPlaceholder && (
        <p className="image-placeholder-note">
          仮画像です。実物の細部を再現した資料ではありません。
        </p>
      )}
      {active.phase === "guide" && frame ? (
        <div className="vn-scene tourism-guide-scene" data-dialogue-hidden={windowVisibility.hidden || undefined}>
          <div className="vn-background" data-testid="scene-picture">
            <CanalScene backgroundId={frame.background} imageAssetId={landmark.imageAssetId} />
          </div>
          <span className="sr-only">{asset.altJa}</span>
          <div className="vn-character-layer">
            <CharacterPortrait
              characterId="heroine"
              sceneId={landmark.id}
              cityId={landmark.cityId}
              emotion={reaction?.expression ?? resolveDialogueExpression(dialogueExpressions, guideStoryId, frame)}
              active={frame.speaker === "heroine"}
            >
              {reaction?.mark && <ComicEffect effect={reaction.mark} reduceMotion={reduceMotion} cueKey={active.storyState ?? undefined} />}
            </CharacterPortrait>
          </div>
          <div
            ref={dialogueRef}
            className="tourism-guide paper vn-dialogue"
            data-testid="tourism-guide"
            inert={windowVisibility.hidden}
            aria-hidden={windowVisibility.hidden || undefined}
          >
            <div className="speaker">{speaker}</div>
            <DialogueControls close={<button type="button" className="text-button" data-testid="tourism-skip" aria-label="観光案内を閉じる" onClick={onSkip}>閉じる</button>} entries={entries} auto={autoAdvance} />
            <DialogueText
              key={game.revision}
              ref={sceneTap.line}
              text={frame.text}
              speed={autoAdvance.fast ? 0 : speed}
              onReady={onReady}
              onAdvance={advanceSafely}
            />
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
            <button className="text-button" data-testid="guide-replay" onClick={onReplayGuide}>観光案内をもう一度読む</button>
          </details>
        </div>
      )}
      {active.phase === "guide" && creditsOpen && <BackgroundCredits asset={asset} onClose={() => setCreditsOpen(false)} />}
    </section>
  );
}
