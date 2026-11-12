import type { ChoiceDisplay } from "../../domain/scene-effects";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getCityContent, dateDestinations, dialogueExpressions, dialogueReactions, storyState } from "../../content";
import type { DateDefinition } from "../../content";
import { resolveDialogueExpression } from "../../content/dialogue-expressions";
import { resolveDialogueReaction } from "../../content/dialogue-reactions";
import type { GameState } from "../../domain/game";
import { CanalScene } from "../../components/CanalScene";
import { CharacterPortrait } from "../../components/CharacterPortrait";
import { portraitFocus } from "../../components/speaker-focus";
import { nameCutIn, speakerPlate } from "../../components/speaker-plate";
import { useNameCutIn } from "../../components/NameCutIn";
import { ComicEffect } from "../../components/ComicEffect";
import { DIALOGUE_WINDOW_ATTRIBUTE, DialogueText } from "../../components/DialogueText";
import { LineStage, PhotoShowLayer, RecallLayer } from "../../components/LineStage";
import { lineCues, lineSpeed, showsSpeakerPlate } from "../../components/line-staging";
import { playSe } from "../../audio/sound-effects";
import { useDialogueLog } from "../../components/DialogueLog";
import { useDialogueScrollReset } from "../../components/useDialogueScrollReset";
import { useAutoAdvance } from "../../components/useAutoAdvance";
import { readLineId, type ReadSkip } from "../../components/read-skip";
import { DialogueControls, DialogueWindowHead } from "../../components/DialogueControls";
import { dialogueObstructed } from "../../components/dialogueObstructed";
import { DialogueWindowHide, DialogueWindowRestore, useDialogueWindow } from "../../components/DialogueWindowVisibility";
import { useSceneTap } from "../../components/useSceneTap";
import { resolveRomancePresentation } from "./romance-presentation";
import { SceneHeading } from "../../components/SceneHeading";
import { useSpeakingPerson } from "../../components/useSpeakingPerson";
import { speakingPerson } from "../../domain/scene-person";
import "./romance-scene.css";
import "../journey/encounter.css";

export function RomanceScene({
  game,
  date,
  speed,
  autoAdvanceEnabled = false,
  readSkip,
  reduceMotion,
  onSelect,
  choiceDisplay,
  onAdvance,
  onFinish,
}: {
  game: GameState;
  date: DateDefinition | undefined;
  speed: number;
  onSpeed: (speed: number) => void;
  autoAdvanceEnabled?: boolean;
  /** This device's read lines: 高速送り stops at a line not read before (read-skip.ts). */
  readSkip?: ReadSkip;
  reduceMotion: boolean;
  onSelect: (index: number, revision: number) => boolean;
  /** How each choice shows (decision 43: a date written with tags hides or greys some); all open when left out. */
  choiceDisplay?: (index: number) => ChoiceDisplay;
  onAdvance: () => void;
  onFinish: () => void;
}) {
  const active = game.activeDate!;
  const frame = active.frame;
  // A restored save may still be reading the original Ink. Its annotations
  // and location belong to that script, not necessarily the replacement.
  const { storyId, destinationId } = resolveRomancePresentation(date, active);
  const destination = destinationId
    ? dateDestinations.find((item) => item.id === destinationId)
    : undefined;
  const reaction = resolveDialogueReaction(dialogueReactions, storyId, frame, "heroine");
  const emotion = reaction?.expression ?? resolveDialogueExpression(dialogueExpressions, storyId, frame);
  // A person with a portrait who speaks in their own name stands opposite her from that line
  // (speakingPerson); `# speaker: enemy` or its reaction sends them off.
  const speaking = speakingPerson(storyState.people, frame);
  const personId = useSpeakingPerson(speaking, frame.speaker === "enemy" || !!resolveDialogueReaction(dialogueReactions, storyId, frame, "enemy"));
  const { name: speaker, narration } = speakerPlate(frame, { heroine: game.heroineName, player: game.playerName }, storyState.people);
  // A line's `# cutin: name` shows its speaker's name plate for a moment (NameCutIn; a person's: a date has no one opposite).
  const nameCut = useNameCutIn(nameCutIn(frame, undefined, storyState.people), active.storyState);
  const { ready, onReady, entries } = useDialogueLog(
    active.dateId,
    game.revision,
    speaker,
    frame.text,
  );
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
    readSkip,
    lineId: frame.text ? readLineId(active.dateId, frame.text) : null,
  });
  const sceneTap = useSceneTap({ active: true, lineShown: ready, choicesShown: frame.choices.length > 0, windowHidden: windowVisibility.hidden });
  return (
    <div className="vn-scene romance-scene" data-testid="romance-scene" data-dialogue-hidden={windowVisibility.hidden || undefined} data-has-choices={frame.choices.length > 0} data-quiet={frame.quiet} {...sceneTap.props}>
      <div className="vn-background" data-testid="scene-picture">
        <CanalScene backgroundId={frame.background} />
      </div>
      <RecallLayer imageId={frame.recall} />
      <PhotoShowLayer photo={frame.photo} />
      {/* The date's heading (D4): its destination, or 「デート」 when it has none. */}
      <SceneHeading label={destination ? `${getCityContent(destination.cityId).city.nameJa} ／ ${destination.nameJa}` : "デート"} />
      {destination?.referenceImage && (
        <aside className="date-reference" aria-label="訪問先の写真" data-no-advance>
          <span data-testid="destination-reference-note">{destination.referenceImage.backgroundNoteJa}</span>
          <a data-testid="destination-reference-link" href={destination.referenceImage.url} target="_blank" rel="noreferrer">
            {destination.referenceImage.labelJa} <span aria-hidden="true">↗</span>
          </a>
        </aside>
      )}
      {/* With a person on stage the two stand side by side (the encounter's slots); her portrait
          keeps its place in the tree, so it is not drawn again when they come in. */}
      <div className={`vn-character-layer${personId ? " encounter-character-layer" : ""}`} data-two-characters={personId ? true : undefined}>
        <div className={personId ? "encounter-character-slot encounter-character-heroine" : undefined}>
          <CharacterPortrait
            characterId="heroine"
            sceneId={active.dateId}
            cityId={game.currentCityId}
            emotion={emotion}
            focus={portraitFocus(frame.speaker, "heroine")}
            stand={frame.stand}
          >
            {reaction?.mark && <ComicEffect effect={reaction.mark} reduceMotion={reduceMotion} cueKey={active.storyState} />}
          </CharacterPortrait>
        </div>
        {personId && <div className="encounter-character-slot encounter-character-enemy">
          <CharacterPortrait key={personId} characterId={personId} focus={speaking === personId ? "speaking" : portraitFocus(frame.speaker, "enemy")} />
        </div>}
      </div>
      <section
        className="vn-dialogue paper story-paper"
        {...{ [DIALOGUE_WINDOW_ATTRIBUTE]: "" }}
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
          narration={narration}
          cutIn={nameCut}
          speaker={showsSpeakerPlate(frame) && speaker}
          controls={<DialogueControls close={<DialogueWindowHide state={windowVisibility} />} entries={entries} auto={autoAdvance} />}
        />
        <div ref={dialogueRef} className="vn-window-body">
            <LineStage frame={frame} names={{ heroine: game.heroineName, player: game.playerName }} compact={frame.choices.length > 0}>
              <DialogueText
                key={game.revision}
                ref={sceneTap.line}
                text={frame.text}
                delivery={frame.delivery}
                voiceId={frame.voiceId}
                seId={frame.seId}
                cues={lineCues(frame, !!nameCut)}
                voice={autoAdvance.voice}
                speed={autoAdvance.fast ? 0 : lineSpeed(speed, frame)}
                onReady={onReady}
                onAdvance={advance}
              />
            </LineStage>
            {frame.choices.length ? (
              <div className="choices">
                {/* No 「返答を選んでください」 under it (2026-11-11, the user's decision): the replies coming in one after another say it. */}
                <p className="choice-hint">あなたは、どう返す？</p>
                {frame.choices.filter((choice) => choiceDisplay?.(choice.index).show !== "hidden").map((choice, index) => (
                  <button
                    disabled={!ready || choiceReadyRevision !== game.revision || choiceDisplay?.(choice.index).show === "grey"}
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
                      } else playSe("ui_confirm");
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
      <DialogueWindowRestore state={windowVisibility} />
    </div>
  );
}
