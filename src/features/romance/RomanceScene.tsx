import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getCityContent, dateDestinations, dialogueExpressions, dialogueReactions, presentation, tourismAssets } from "../../content";
import type { DateDefinition } from "../../content";
import { resolveDialogueExpression } from "../../content/dialogue-expressions";
import { resolveDialogueReaction } from "../../content/dialogue-reactions";
import type { GameState } from "../../domain/game";
import { CanalScene } from "../../components/CanalScene";
import { CharacterPortrait } from "../../components/CharacterPortrait";
import { ComicEffect } from "../../components/ComicEffect";
import { DialogueText } from "../../components/DialogueText";
import { useDialogueLog } from "../../components/DialogueLog";
import { useDialogueScrollReset } from "../../components/useDialogueScrollReset";
import { useAutoAdvance } from "../../components/useAutoAdvance";
import { DialogueControls, DialogueWindowHead } from "../../components/DialogueControls";
import { dialogueObstructed } from "../../components/dialogueObstructed";
import { DialogueWindowHide, DialogueWindowRestore, useDialogueWindow } from "../../components/DialogueWindowVisibility";
import { useSceneTap } from "../../components/useSceneTap";
import { resolveRomancePresentation } from "./romance-presentation";
import { BackgroundCredits } from "../../components/BackgroundCredits";
import { SceneCreditButton, SceneLabelLine } from "../../components/SceneLabelLine";
import "./romance-scene.css";

export function RomanceScene({
  game,
  date,
  speed,
  autoAdvanceEnabled = false,
  reduceMotion,
  onSelect,
  onAdvance,
  onFinish,
}: {
  game: GameState;
  date: DateDefinition | undefined;
  speed: number;
  onSpeed: (speed: number) => void;
  autoAdvanceEnabled?: boolean;
  reduceMotion: boolean;
  onSelect: (index: number, revision: number) => boolean;
  onAdvance: () => void;
  onFinish: () => void;
}) {
  const active = game.activeDate!;
  const frame = active.frame;
  const backgroundImageAssetId = presentation.backgrounds[frame.background]?.imageAssetId;
  const backgroundAsset = backgroundImageAssetId
    ? tourismAssets.find((asset) => asset.id === backgroundImageAssetId)
    : undefined;
  // A restored save may still be reading the original Ink. Its annotations
  // and location belong to that script, not necessarily the replacement.
  const { storyId, destinationId } = resolveRomancePresentation(date, active);
  const destination = destinationId
    ? dateDestinations.find((item) => item.id === destinationId)
    : undefined;
  const reaction = resolveDialogueReaction(dialogueReactions, storyId, frame, "heroine");
  const emotion = reaction?.expression ?? resolveDialogueExpression(dialogueExpressions, storyId, frame);
  const speaker =
    frame.speaker === "heroine"
      ? game.heroineName
      : frame.speaker === "player"
        ? game.playerName
        : "旅の風景";
  const { ready, onReady, entries } = useDialogueLog(
    active.dateId,
    game.revision,
    speaker,
    frame.text,
  );
  const [creditsOpen, setCreditsOpen] = useState(false);
  const windowVisibility = useDialogueWindow();
  const dialogueRef = useDialogueScrollReset<HTMLDivElement>(active.storyState);
  const pendingChoice = useRef<{
    revision: number;
    dateId: string;
    choiceCount: number;
    text: string;
  } | null>(null);
  const [exitingChoice, setExitingChoice] = useState<string | null>(null);
  // This is presentation only: the saved frame has already advanced. A
  // failed save never changes revision and cannot
  // trigger it; a reload has no pending visual state to replay.
  useLayoutEffect(() => {
    const choice = pendingChoice.current;
    if (!choice || choice.revision === game.revision) {
      setExitingChoice(null);
      return;
    }
    pendingChoice.current = null;
    if (
      active.dateId !== choice.dateId ||
      active.choiceCount !== choice.choiceCount + 1 ||
      reduceMotion ||
      document.hidden ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setExitingChoice(null);
      return;
    }
    setExitingChoice(choice.text);
    const timer = window.setTimeout(() => setExitingChoice(null), 240);
    return () => window.clearTimeout(timer);
  }, [game.revision, active.dateId, active.choiceCount, reduceMotion]);
  useEffect(() => {
    function clearWhenHidden() {
      if (document.hidden) setExitingChoice(null);
    }
    document.addEventListener("visibilitychange", clearWhenHidden);
    return () =>
      document.removeEventListener("visibilitychange", clearWhenHidden);
  }, []);
  const [choiceReadyRevision, setChoiceReadyRevision] = useState<number | null>(
    null,
  );
  // A reveal tap or the previous advance tap must not leak into a new choice.
  // Native disabled buttons also protect keyboard and assistive input.
  useEffect(() => {
    if (!ready || !frame.choices.length) return;
    const timer = window.setTimeout(
      () => setChoiceReadyRevision(game.revision),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [ready, frame.choices.length, game.revision]);
  const choiceLock = useRef(false);
  useEffect(() => {
    choiceLock.current = false;
  }, [game.revision]);
  function advance() {
    if (!ready || frame.choices.length || windowVisibility.hidden || dialogueObstructed()) return;
    if (frame.ended) onFinish();
    else onAdvance();
  }
  const autoAdvance = useAutoAdvance({
    ready,
    canAdvance: !windowVisibility.hidden && !frame.ended && frame.choices.length === 0,
    text: frame.text,
    onAdvance: advance,
    defaultEnabled: autoAdvanceEnabled,
  });
  const sceneTap = useSceneTap({ active: true, lineShown: ready, choicesShown: frame.choices.length > 0, windowHidden: windowVisibility.hidden });
  return (
    <div className="vn-scene romance-scene" data-testid="romance-scene" data-dialogue-hidden={windowVisibility.hidden || undefined} data-has-choices={frame.choices.length > 0} {...sceneTap.props}>
      <div className="vn-background" data-testid="scene-picture">
        <CanalScene backgroundId={frame.background} />
      </div>
      {/* The date's heading (D4): its destination, or 「デート」 when it has none. */}
      <SceneLabelLine
        label={destination ? `${getCityContent(destination.cityId).city.nameJa} ／ ${destination.nameJa}` : "デート"}
        labelProps={destination ? { "data-testid": "date-destination" } : undefined}
      >
        {backgroundAsset && <SceneCreditButton onClick={() => setCreditsOpen(true)} />}
      </SceneLabelLine>
      {destination?.referenceImage && (
        <aside className="date-reference" aria-label="訪問先の写真" data-no-advance>
          <span data-testid="destination-reference-note">{destination.referenceImage.backgroundNoteJa}</span>
          <a data-testid="destination-reference-link" href={destination.referenceImage.url} target="_blank" rel="noreferrer">
            {destination.referenceImage.labelJa} <span aria-hidden="true">↗</span>
          </a>
        </aside>
      )}
      <div className="vn-character-layer">
        <CharacterPortrait
          characterId="heroine"
          sceneId={active.dateId}
          cityId={game.currentCityId}
          emotion={emotion}
          active={frame.speaker === "heroine"}
        >
          {reaction?.mark && <ComicEffect effect={reaction.mark} reduceMotion={reduceMotion} cueKey={active.storyState} />}
        </CharacterPortrait>
      </div>
      <section
        className="vn-dialogue paper story-paper"
        aria-label="デートの会話"
        data-has-choices={frame.choices.length > 0}
        inert={windowVisibility.hidden}
        aria-hidden={windowVisibility.hidden || undefined}
      >
        {exitingChoice && (
          <div
            className="vn-choice-exit"
            aria-hidden="true"
            onAnimationEnd={() => setExitingChoice(null)}
          >
            {exitingChoice}
          </div>
        )}
        <DialogueWindowHead
          narration={frame.speaker !== "heroine" && frame.speaker !== "player"}
          speaker={<>
            {speaker}
            {frame.speaker === "heroine" && frame.emotion !== "neutral" && (
              <span className="emotion">
                {presentation.emotions[frame.emotion]}
              </span>
            )}
          </>}
          controls={<DialogueControls close={<DialogueWindowHide state={windowVisibility} />} entries={entries} auto={autoAdvance} />}
        />
        <div ref={dialogueRef} className="vn-window-body">
            <DialogueText
              key={game.revision}
              ref={sceneTap.line}
              text={frame.text}
              speed={autoAdvance.fast ? 0 : speed}
              onReady={onReady}
              onAdvance={advance}
            />
            {frame.choices.length ? (
              <div className="choices">
                <p className="choice-hint">
                  あなたは、どう返す？
                  <span>返答を選んでください</span>
                </p>
                {frame.choices.map((choice, index) => (
                  <button
                    disabled={!ready || choiceReadyRevision !== game.revision}
                    key={`${game.revision}-${choice.index}`}
                    className="choice"
                    data-testid="date-choice"
                    onClick={() => {
                      if (choiceLock.current || windowVisibility.hidden || dialogueObstructed()) return;
                      choiceLock.current = true;
                      pendingChoice.current = {
                        revision: game.revision,
                        dateId: active.dateId,
                        choiceCount: active.choiceCount,
                        text: choice.text,
                      };
                      if (!onSelect(choice.index, game.revision)) {
                        choiceLock.current = false;
                        pendingChoice.current = null;
                      }
                    }}
                  >
                    <span className="choice-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{choice.text}</span>
                  </button>
                ))}
              </div>
            ) : frame.ended ? (
              <button disabled={!ready} className="primary" data-testid="date-finish" onClick={advance}>
                {date?.kind === "normal"
                  ? "デートを終える"
                  : "この時間を終える"}{" "}
                <span aria-hidden="true">→</span>
              </button>
            ) : null}
        </div>
      </section>
      {creditsOpen && backgroundAsset && (
        <BackgroundCredits asset={backgroundAsset} onClose={() => setCreditsOpen(false)} />
      )}
      <DialogueWindowRestore state={windowVisibility} />
    </div>
  );
}
