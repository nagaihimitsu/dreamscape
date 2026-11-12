import { useEffect } from "react";
import { battles, dialogueExpressions, dialogueReactions, episodes, getCityContent, storyState } from "../../content";
import { resolveDialogueExpression } from "../../content/dialogue-expressions";
import { resolveDialogueReaction } from "../../content/dialogue-reactions";
import { activeEpilogueStoryId, epilogueScene } from "../../domain/epilogue";
import { scenePerson, speakingPerson } from "../../domain/scene-person";
import { getNextCity } from "../../domain/city-travel";
import { tourLegUnderway } from "../../domain/tour";
import { getJourneyForCity } from "../../content/journeys";
import type { GameState } from "../../domain/game";
import { DIALOGUE_WINDOW_ATTRIBUTE, DialogueText } from "../../components/DialogueText";
import { LineStage, PhotoShowLayer, RecallLayer } from "../../components/LineStage";
import { lineCues, lineSpeed, showsSpeakerPlate } from "../../components/line-staging";
import { CanalScene } from "../../components/CanalScene";
import { CharacterPortrait } from "../../components/CharacterPortrait";
import { portraitFocus } from "../../components/speaker-focus";
import { nameCutIn, speakerPlate } from "../../components/speaker-plate";
import { useNameCutIn } from "../../components/NameCutIn";
import { useStaysOnStage } from "../../components/useStaysOnStage";
import { useSpeakingPerson } from "../../components/useSpeakingPerson";
import "./encounter.css";
import { ComicEffect } from "../../components/ComicEffect";
import { useDialogueLog } from "../../components/DialogueLog";
import { useDialogueScrollReset } from "../../components/useDialogueScrollReset";
import { useAutoAdvance } from "../../components/useAutoAdvance";
import { readLineId, type ReadSkip } from "../../components/read-skip";
import { DialogueControls, DialogueWindowHead } from "../../components/DialogueControls";
import { dialogueObstructed } from "../../components/dialogueObstructed";
import { DialogueWindowHide, DialogueWindowRestore, useDialogueWindow } from "../../components/DialogueWindowVisibility";
import { useSceneTap } from "../../components/useSceneTap";
import { CityArrivalLogo } from "./CityArrivalLogo";
import { SceneChoices, type SceneChoiceView } from "../../components/SceneChoices";

export function EpilogueScreen({
  game,
  speed,
  reduceMotion,
  autoAdvanceEnabled = false,
  readSkip,
  onAdvance,
  onLogoComplete,
  choices = [],
  onChoose,
}: {
  game: GameState;
  speed: number;
  reduceMotion: boolean;
  onSpeed: (value: number) => void;
  autoAdvanceEnabled?: boolean;
  /** This device's read lines: 高速送り stops at a line not read before (read-skip.ts). */
  readSkip?: ReadSkip;
  onAdvance: () => void;
  onLogoComplete?: () => void;
  /** The shown choices of the open choice point (stage 3a; hidden ones are left out by the caller). */
  choices?: SceneChoiceView[];
  onChoose?: (index: number) => void;
}) {
  const active = game.activeEpilogue!;
  const arrival = active.kind === "arrival";
  // A tour leg's narration (tour stage 2b) is read here too: its leg names it, and its end goes on with the tour.
  const leg = active.kind === "tour_leg" ? tourLegUnderway(game) : undefined;
  const showLogo = arrival && !active.logoComplete;
  const city = getCityContent(game.currentCityId).city;
  const nextCity = getJourneyForCity(game.currentCityId)?.cityTransition === "after_epilogue" ? getNextCity(game) : undefined;
  const windowVisibility = useDialogueWindow();
  const dialogueRef = useDialogueScrollReset<HTMLDivElement>(active.storyState);
  const frame = active.frame;
  const episode = episodes.find((item) => item.id === active.episodeId);
  const storyId = activeEpilogueStoryId(active) ?? episode?.epilogueStoryId ?? "";
  const reaction = resolveDialogueReaction(dialogueReactions, storyId, frame, "heroine");
  // The scene's person with a portrait (# person:) stands opposite her from their first line or reaction.
  const person = scenePerson(storyState.people, epilogueScene(active)?.people);
  const personReaction = person ? resolveDialogueReaction(dialogueReactions, storyId, frame, "enemy") : undefined;
  const personOn = useStaysOnStage(!!person && (frame.speaker === "enemy" || !!personReaction));
  // A person with a portrait who speaks in their own name stands there from that line until the scene's own person speaks or reacts.
  const speaking = speakingPerson(storyState.people, frame);
  const speakingOn = useSpeakingPerson(speaking, frame.speaker === "enemy" || !!personReaction);
  const opposite = speakingOn ?? (person && personOn ? person.characterId : undefined);
  const finaleOpponent = battles.find((battle) => battle.id === episode?.battleId);
  const enemyName = person?.nameJa ?? finaleOpponent?.enemyNameJa;
  const { name: speaker, narration } = speakerPlate(frame, { heroine: game.heroineName, player: game.playerName, enemy: enemyName },
    storyState.people);
  // A line's `# cutin: name` shows its speaker's name plate for a moment (NameCutIn): for `# speaker: enemy`, the scene's
  // person, else the city finale's opponent (as its plate names them). The city's title card over an arrival holds it.
  const enemyCut = person ? { nameJa: person.nameJa, ...(person.titleJa ? { titleJa: person.titleJa } : {}) }
    : finaleOpponent && { nameJa: finaleOpponent.enemyNameJa, titleJa: finaleOpponent.enemyTitleJa };
  const nameCut = useNameCutIn(nameCutIn(frame, enemyCut, storyState.people), active.storyState, showLogo);
  const label = active.kind === "tour_leg"
    ? { eyebrow: "ツアー", heading: leg?.labelJa ?? "ツアーの移動", region: "ツアーの移動の語り", next: "ツアーを続ける", testId: "tour-leg-screen" }
    : arrival ? { eyebrow: "旅のはじまり", heading: `${city.nameJa}に到着`, region: "到着の会話", next: "街を見に行く", testId: "city-arrival-screen" }
      : { eyebrow: "都市エピローグ", heading: episode?.clearTitleJa ?? "", region: "都市エピローグ",
        next: nextCity ? `${nextCity.city.nameJa}へ進む` : "ふたりの自由時間へ", testId: "city-epilogue-screen" };
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
    canAdvance: !frame.ended && !frame.choices.length && !showLogo && !windowVisibility.hidden,
    text: frame.text,
    onAdvance: advanceSafely,
    defaultEnabled: autoAdvanceEnabled,
    readSkip,
    lineId: frame.text ? readLineId(storyId || active.episodeId, frame.text) : null,
  });
  const sceneTap = useSceneTap({ active: true, lineShown: ready, choicesShown: frame.choices.length > 0, windowHidden: windowVisibility.hidden });
  useEffect(() => {
    document
      .getElementById("city-epilogue-screen")
      ?.scrollIntoView({ block: "start" });
  }, []);
  return (
    <div id="city-epilogue-screen" data-testid={label.testId}>
      {showLogo && <CityArrivalLogo nameJa={city.nameJa} reduceMotion={reduceMotion} onEnd={onLogoComplete ?? (() => undefined)} />}
      <div className="vn-scene" data-dialogue-hidden={windowVisibility.hidden || undefined} data-quiet={frame.quiet} {...sceneTap.props}>
        <div className="vn-background" data-testid="scene-picture">
          <CanalScene backgroundId={frame.background} />
        </div>
        <RecallLayer imageId={frame.recall} />
        <PhotoShowLayer photo={frame.photo} />
        {/* With the scene's person on stage the two stand side by side (the encounter's slots); her
            portrait keeps its place in the tree, so it is not drawn again when they come in. */}
        <div className={`vn-character-layer${opposite ? " encounter-character-layer" : ""}`} data-two-characters={opposite ? true : undefined}>
          <div className={opposite ? "encounter-character-slot encounter-character-heroine" : undefined}>
            <CharacterPortrait
              characterId="heroine"
              sceneId={active.episodeId}
              cityId={episode?.cityId ?? game.currentCityId}
              emotion={reaction?.expression ?? resolveDialogueExpression(dialogueExpressions, storyId, frame)}
              focus={portraitFocus(frame.speaker, "heroine")}
              stand={frame.stand}
            >
              {reaction?.mark && <ComicEffect effect={reaction.mark} reduceMotion={reduceMotion} cueKey={active.storyState} />}
            </CharacterPortrait>
          </div>
          {opposite && <div className="encounter-character-slot encounter-character-enemy">
            <CharacterPortrait
              key={opposite}
              characterId={opposite}
              emotion={speakingOn ? "neutral" : personReaction?.expression ?? (frame.speaker === "enemy" ? frame.emotion : "neutral")}
              focus={speakingOn && speaking === speakingOn ? "speaking" : portraitFocus(frame.speaker, "enemy")}
            >
              {personReaction?.mark && <ComicEffect effect={personReaction.mark} reduceMotion={reduceMotion} cueKey={active.storyState} />}
            </CharacterPortrait>
          </div>}
        </div>
        <section
          className="paper story-paper vn-dialogue"
          {...{ [DIALOGUE_WINDOW_ATTRIBUTE]: "" }}
          aria-label={label.region}
          inert={windowVisibility.hidden || showLogo}
          aria-hidden={windowVisibility.hidden || showLogo || undefined}
        >
          <DialogueWindowHead
            cutIn={nameCut}
            speaker={showsSpeakerPlate(frame) && speaker}
            narration={narration}
            controls={<DialogueControls close={<DialogueWindowHide state={windowVisibility} />} entries={entries} auto={autoAdvance} />}
          />
          <div ref={dialogueRef} className="vn-window-body">
          {/* The scene label names the scene (an arrival's city also has its title card): the heading stays for
              screen readers and for the focus only, in an arrival, an epilogue and a tour leg (2026-11-11 user decision). */}
          <p className="eyebrow sr-only">{label.eyebrow}</p>
          {/* Takes a lost focus when the talk opens (scene-focus.ts); inert under an arrival's title card. */}
          <h1 className="sr-only" tabIndex={-1}>{label.heading}</h1>
          <LineStage frame={frame} names={{ heroine: game.heroineName, player: game.playerName, enemy: enemyName }} compact={frame.choices.length > 0}>
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
              onAdvance={advanceSafely}
            />
          </LineStage>
          {frame.choices.length > 0 && onChoose && <SceneChoices choices={choices} disabled={!ready} onChoose={onChoose} testId="epilogue-choice" />}
          {frame.ended && <button
            className="next"
            disabled={!ready}
            data-testid={arrival ? "arrival-advance" : "epilogue-advance"}
            onClick={advanceSafely}
          >
            {label.next}{" "}
            <span aria-hidden="true">→</span>
          </button>}
          </div>
        </section>
        <DialogueWindowRestore state={windowVisibility} />
      </div>
    </div>
  );
}
