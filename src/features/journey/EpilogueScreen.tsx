import { useEffect } from "react";
import { battles, dialogueExpressions, dialogueReactions, episodes, getCityContent } from "../../content";
import { resolveDialogueExpression } from "../../content/dialogue-expressions";
import { resolveDialogueReaction } from "../../content/dialogue-reactions";
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
import { DialogueControls, DialogueWindowHead } from "../../components/DialogueControls";
import { dialogueObstructed } from "../../components/dialogueObstructed";
import { DialogueWindowHide, DialogueWindowRestore, useDialogueWindow } from "../../components/DialogueWindowVisibility";
import { useSceneTap } from "../../components/useSceneTap";
import { CityArrivalLogo } from "./CityArrivalLogo";

export function EpilogueScreen({
  game,
  speed,
  reduceMotion,
  autoAdvanceEnabled = false,
  onAdvance,
  onLogoComplete,
}: {
  game: GameState;
  speed: number;
  reduceMotion: boolean;
  onSpeed: (value: number) => void;
  autoAdvanceEnabled?: boolean;
  onAdvance: () => void;
  onLogoComplete?: () => void;
}) {
  const active = game.activeEpilogue!;
  const arrival = active.kind === "arrival";
  const showLogo = arrival && !active.logoComplete;
  const city = getCityContent(game.currentCityId).city;
  const nextCity = getJourneyForCity(game.currentCityId)?.cityTransition === "after_epilogue" ? getNextCity(game) : undefined;
  const windowVisibility = useDialogueWindow();
  const dialogueRef = useDialogueScrollReset<HTMLDivElement>(active.storyState);
  const frame = active.frame;
  const episode = episodes.find((item) => item.id === active.episodeId)!;
  const storyId = activeEpilogueStoryId(active) ?? episode.epilogueStoryId!;
  const reaction = resolveDialogueReaction(dialogueReactions, storyId, frame, "heroine");
  const speaker =
    frame.speaker === "heroine"
      ? game.heroineName
      : frame.speaker === "player"
        ? game.playerName
        : frame.speaker === "enemy"
          ? battles.find((battle) => battle.id === episode.battleId)?.enemyNameJa ?? "旅の風景"
          : "旅の風景";
  const { ready, onReady, entries } = useDialogueLog(
    active.episodeId,
    game.revision,
    speaker,
    frame.text,
  );
  const advanceSafely = () => {
    if (ready && !showLogo && !windowVisibility.hidden && !dialogueObstructed()) onAdvance();
  };
  const autoAdvance = useAutoAdvance({
    ready,
    canAdvance: !frame.ended && !showLogo && !windowVisibility.hidden,
    text: frame.text,
    onAdvance: advanceSafely,
    defaultEnabled: autoAdvanceEnabled,
  });
  const sceneTap = useSceneTap({ active: true, lineShown: ready, choicesShown: false, windowHidden: windowVisibility.hidden });
  useEffect(() => {
    document
      .getElementById("city-epilogue-screen")
      ?.scrollIntoView({ block: "start" });
  }, []);
  return (
    <div id="city-epilogue-screen" data-testid={arrival ? "city-arrival-screen" : "city-epilogue-screen"}>
      {showLogo && <CityArrivalLogo nameJa={city.nameJa} reduceMotion={reduceMotion} onEnd={onLogoComplete ?? (() => undefined)} />}
      <div className="vn-scene" data-dialogue-hidden={windowVisibility.hidden || undefined} {...sceneTap.props}>
        <div className="vn-background" data-testid="scene-picture">
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
          className="paper story-paper vn-dialogue"
          aria-label={arrival ? "到着の会話" : "都市エピローグ"}
          inert={windowVisibility.hidden || showLogo}
          aria-hidden={windowVisibility.hidden || showLogo || undefined}
        >
          <DialogueWindowHead
            speaker={speaker}
            narration={frame.speaker !== "heroine" && frame.speaker !== "player" && frame.speaker !== "enemy"}
            controls={<DialogueControls close={<DialogueWindowHide state={windowVisibility} />} entries={entries} auto={autoAdvance} />}
          />
          <div ref={dialogueRef} className="vn-window-body">
          <p className="eyebrow">{arrival ? "旅のはじまり" : "都市エピローグ"}</p>
          {/* Takes a lost focus when the talk opens (scene-focus.ts); inert under an arrival's title card. */}
          <h1 tabIndex={-1}>{arrival ? `${city.nameJa}に到着` : episode.clearTitleJa}</h1>
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
            disabled={!ready}
            data-testid={arrival ? "arrival-advance" : "epilogue-advance"}
            onClick={advanceSafely}
          >
            {arrival ? "街を見に行く" : nextCity ? `${nextCity.city.nameJa}へ進む` : "ふたりの自由時間へ"}{" "}
            <span aria-hidden="true">→</span>
          </button>}
          </div>
        </section>
        <DialogueWindowRestore state={windowVisibility} />
      </div>
    </div>
  );
}
