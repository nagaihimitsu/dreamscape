import { useEffect } from "react";
import { dialogueExpressions, dialogueReactions, episodes } from "../../content";
import { resolveDialogueExpression } from "../../content/dialogue-expressions";
import { resolveDialogueReaction } from "../../content/dialogue-reactions";
import { presentationStoryId } from "../../content/legacy-milano";
import { activeEpilogueStoryId } from "../../domain/epilogue";
import { getNextCity } from "../../domain/city-travel";
import { getJourneyForCity } from "../../content/journeys";
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
import { DialogueWindowHide, DialogueWindowRestore, useDialogueWindow } from "../../components/DialogueWindowVisibility";

export function EpilogueScreen({
  game,
  speed,
  reduceMotion,
  autoAdvanceEnabled = false,
  onAdvance,
}: {
  game: GameState;
  speed: number;
  reduceMotion: boolean;
  onSpeed: (value: number) => void;
  autoAdvanceEnabled?: boolean;
  onAdvance: () => void;
}) {
  const active = game.activeEpilogue!;
  const nextCity = getJourneyForCity(game.currentCityId)?.id === "golden_triangle" ? getNextCity(game) : undefined;
  const windowVisibility = useDialogueWindow();
  const dialogueRef = useDialogueScrollReset<HTMLElement>(active.storyState);
  const frame = active.frame;
  const episode = episodes.find((item) => item.id === active.episodeId)!;
  const storyId = presentationStoryId(activeEpilogueStoryId(active) ?? episode.epilogueStoryId!);
  const reaction = resolveDialogueReaction(dialogueReactions, storyId, frame, "heroine");
  const speaker =
    frame.speaker === "heroine"
      ? game.heroineName
      : frame.speaker === "player"
        ? game.playerName
        : "旅の風景";
  const { ready, onReady, entries } = useDialogueLog(
    active.episodeId,
    game.revision,
    speaker,
    frame.text,
  );
  const advanceSafely = () => {
    if (ready && !windowVisibility.hidden && !dialogueObstructed()) onAdvance();
  };
  const autoAdvance = useAutoAdvance({
    ready,
    canAdvance: !frame.ended && !windowVisibility.hidden,
    text: frame.text,
    onAdvance: advanceSafely,
    defaultEnabled: autoAdvanceEnabled,
  });
  useEffect(() => {
    document
      .getElementById("city-epilogue-screen")
      ?.scrollIntoView({ block: "start" });
  }, []);
  return (
    <div id="city-epilogue-screen" data-testid="city-epilogue-screen">
      <div className="vn-scene" data-dialogue-hidden={windowVisibility.hidden || undefined}>
        <div className="vn-background">
          <CanalScene backgroundId={frame.background} />
        </div>
        <div className="vn-character-layer">
          <CharacterPortrait
            characterId="heroine"
            sceneId={episode.id}
            cityId={episode.cityId}
            emotion={reaction?.expression ?? resolveDialogueExpression(dialogueExpressions, storyId, frame)}
            active={frame.speaker === "heroine"}
          >
            {reaction?.mark && <ComicEffect effect={reaction.mark} reduceMotion={reduceMotion} cueKey={active.storyState} />}
          </CharacterPortrait>
        </div>
        <section
          ref={dialogueRef}
          className="paper story-paper vn-dialogue"
          aria-label="都市エピローグ"
          inert={windowVisibility.hidden}
          aria-hidden={windowVisibility.hidden || undefined}
        >
          <div className="speaker">{speaker}</div>
          <DialogueControls close={<DialogueWindowHide state={windowVisibility} label="閉じる" />} entries={entries} auto={autoAdvance} />
          <p className="eyebrow">都市エピローグ</p>
          <h1>{episode.clearTitleJa}</h1>
          <DialogueText
            key={game.revision}
            text={frame.text}
            speed={autoAdvance.fast ? 0 : speed}
            onReady={onReady}
            onAdvance={advanceSafely}
          />
          {frame.ended && <button
            className="next"
            disabled={!ready}
            data-testid="epilogue-advance"
            onClick={advanceSafely}
          >
            {nextCity ? `${nextCity.city.nameJa}へ進む` : "ふたりの自由時間へ"}{" "}
            <span aria-hidden="true">→</span>
          </button>}
        </section>
        <DialogueWindowRestore state={windowVisibility} />
      </div>
    </div>
  );
}
