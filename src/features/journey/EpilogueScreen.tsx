import { useEffect } from "react";
import { battles, dialogueExpressions, dialogueReactions, episodes, getCityContent, storyState } from "../../content";
import { resolveDialogueExpression } from "../../content/dialogue-expressions";
import { resolveDialogueReaction } from "../../content/dialogue-reactions";
import { activeEpilogueStoryId, epilogueScene } from "../../domain/epilogue";
import { scenePerson } from "../../domain/scene-person";
import { getNextCity } from "../../domain/city-travel";
import { tourLegUnderway } from "../../domain/tour";
import { getJourneyForCity } from "../../content/journeys";
import type { GameState } from "../../domain/game";
import { DIALOGUE_WINDOW_ATTRIBUTE, DialogueText } from "../../components/DialogueText";
import { LineStage, PhotoShowLayer, RecallLayer } from "../../components/LineStage";
import { SceneTint, WeatherLayer } from "../../components/SceneAtmosphere";
import { keepsAboveHeads } from "../../components/figures-top";
import { ItemShowLayer } from "../../components/ItemShow";
import { ItemOutLayer, itemOutCard } from "../../components/ItemOut";
import { sceneTimeTint } from "./time-of-day";
import { lineCues, lineSpeed, showsSpeakerPlate } from "../../components/line-staging";
import { CanalScene } from "../../components/CanalScene";
import { CharacterFigure, CharacterPortrait } from "../../components/CharacterPortrait";
import { ChoicePoint } from "../../minigames/host/ChoicePoint";
import { MiniGameSlot } from "../../minigames/host/MiniGameProvider";
import { figureIsEnemy, oppositeFigures, sceneStageOf, stageCast, stageLine } from "../../components/scene-stage";
import { loggedSpeaker, nameCutIn, speakerPlate } from "../../components/speaker-plate";
import { NameCutInPlate, useNameCutIn } from "../../components/NameCutIn";
import { useSceneStage } from "../../components/useSceneStage";
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
import { useEstablishingShot } from "../../components/useEstablishingShot";
import { speakerSpot, useNameBand } from "../../components/name-band";

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
  // She stands from the start; opposite her, the scene's person from their first line or reaction, and a person with a
  // figure who speaks in their own name from that line, each until the other comes in (scene-stage.ts). A line's
  // `# leave:` takes her or them off until they come again (her next line or reaction, their next line or reaction).
  // Only who stands there is drawn.
  const stageScene = sceneStageOf(active.kind ?? "epilogue", person?.characterId);
  const { stage, focus } = useSceneStage(stageLine(frame, storyState.people, { heroine: !!reaction, enemy: !!personReaction }), stageScene);
  const opposite = stage.opposite?.figure;
  const cast = stageCast(stage);
  // The scene's person's expression and mark, on their figure wherever it stands (the other people have one picture each).
  const personEmotion = personReaction?.expression ?? (frame.speaker === "enemy" ? frame.emotion : "neutral");
  const finaleOpponent = battles.find((battle) => battle.id === episode?.battleId);
  const enemyName = person?.nameJa ?? finaleOpponent?.enemyNameJa;
  const plate = speakerPlate(frame, { heroine: game.heroineName, player: game.playerName, enemy: enemyName }, storyState.people);
  const { name: speaker, narration, remembered } = plate;
  // A line's `# cutin: name` shows its speaker's name plate for a moment (NameCutIn): for `# speaker: enemy`, the scene's
  // person, else the city finale's opponent (as its plate names them). The city's title card over an arrival holds it.
  const enemyCut = person ? { nameJa: person.nameJa, ...(person.titleJa ? { titleJa: person.titleJa } : {}) }
    : finaleOpponent && { nameJa: finaleOpponent.enemyNameJa, titleJa: finaleOpponent.enemyTitleJa };
  const nameCut = useNameCutIn(nameCutIn(frame, enemyCut, storyState.people), active.storyState, showLogo);
  const label = active.kind === "tour_leg"
    ? { eyebrow: "ツアー", heading: leg?.labelJa ?? "ツアーの移動", region: "ツアーの移動の語り", next: "ツアーを続ける", testId: "tour-leg-screen" }
    : arrival ? { eyebrow: "旅のはじまり", heading: `${city.nameJa}に到着`, region: "到着の会話", next: "街を見に行く", testId: "city-arrival-screen" }
      : { eyebrow: "都市エピローグ", heading: episode?.clearTitleJa ?? "", region: "都市エピローグ",
        next: nextCity ? `${nextCity.city.nameJa}へ進む` : "ふたりの街歩きへ", testId: "city-epilogue-screen" };
  const { ready, onReady, entries } = useDialogueLog(
    active.episodeId,
    game.revision,
    loggedSpeaker(plate),
    frame.text,
    frame.delivery,
    frame.letter?.translationJa,
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
  const establishing = useEstablishingShot(active.episodeId, game.revision);
  const band = useNameBand(speakerSpot(stage, focus), frame.speaker === "heroine", { sceneId: active.episodeId, cityId: episode?.cityId ?? game.currentCityId });
  useEffect(() => {
    document
      .getElementById("city-epilogue-screen")
      ?.scrollIntoView({ block: "start" });
  }, []);
  return (
    <div id="city-epilogue-screen" data-testid={label.testId}>
      {showLogo && <CityArrivalLogo nameJa={city.nameJa} reduceMotion={reduceMotion} onEnd={onLogoComplete ?? (() => undefined)} />}
      <div className="vn-scene" data-dialogue-hidden={windowVisibility.hidden || undefined} data-has-choices={frame.choices.length > 0} data-quiet={frame.quiet}
        data-establishing={establishing || undefined} {...sceneTap.props}>
        <div className="vn-background" data-testid="scene-picture">
          <CanalScene backgroundId={frame.background} />
          <SceneTint color={sceneTimeTint(game.travel.minute, frame.tint === "off")} />
        </div>
        <WeatherLayer weather={frame.weather} />
        <RecallLayer imageId={frame.recall} />
        <PhotoShowLayer photo={frame.photo} />
        <NameCutInPlate cutIn={nameCut} />
        {/* Not under an arrival's title card, which holds the first line. */}
        <ItemShowLayer itemId={showLogo ? undefined : frame.itemShow} aboveHeads={keepsAboveHeads(frame.speaker)} quiet={!!frame.quiet} />
        <ItemOutLayer card={showLogo ? undefined : itemOutCard(game, frame.itemOut)} quiet={!!frame.quiet} />
        {/* With the scene's person on stage the two stand side by side (the encounter's slots), the person alone in the
            middle while she is off stage; her portrait keeps its place in the tree, so it is not drawn again when they
            come in. Two or three people opposite her (# together:) stand beside each other (stageCast; each keeps its portrait as
            another goes). */}
        <div className={`vn-character-layer${opposite ? " encounter-character-layer" : ""}`} data-two-characters={cast.two ? true : undefined}
          data-together={cast.together}>
          {stage.heroine && <div className={opposite ? "encounter-character-slot encounter-character-heroine" : undefined}>
            <CharacterPortrait
              characterId="heroine"
              sceneId={active.episodeId}
              cityId={episode?.cityId ?? game.currentCityId}
              emotion={reaction?.expression ?? resolveDialogueExpression(dialogueExpressions, storyId, frame)}
              focus={focus.heroine}
              stand={frame.stand}
            >
              {reaction?.mark && <ComicEffect effect={reaction.mark} reduceMotion={reduceMotion} cueKey={active.storyState} />}
            </CharacterPortrait>
          </div>}
          {oppositeFigures(stage, focus).map(({ figure, place, focus: at }) => {
            const personLooks = figureIsEnemy(figure, stageScene);
            return <div key={figure.figure} className={`encounter-character-slot encounter-character-${place === "opposite" ? "enemy" : place}`}>
              <CharacterPortrait characterId={figure.figure} emotion={personLooks ? personEmotion : "neutral"} focus={at}>
                {personLooks && personReaction?.mark && <ComicEffect effect={personReaction.mark} reduceMotion={reduceMotion} cueKey={active.storyState} />}
              </CharacterPortrait>
            </div>;
          })}
        </div>
        <section
          className="paper story-paper vn-dialogue"
          {...{ [DIALOGUE_WINDOW_ATTRIBUTE]: "" }}
          aria-label={label.region}
          data-has-choices={frame.choices.length > 0}
          data-remembered={remembered}
          inert={windowVisibility.hidden || showLogo}
          aria-hidden={windowVisibility.hidden || showLogo || undefined}
        >
          <div className="vn-window">
            <DialogueWindowHead
              speaker={showsSpeakerPlate(frame) && speaker}
              narration={narration}
              remembered={remembered}
              band={band}
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
          </div>
          {/* The talk's tools, in a row under its window (DialogueControls). */}
          <DialogueControls close={<DialogueWindowHide state={windowVisibility} />} entries={entries} auto={autoAdvance} />
          {/* The choices float above the window, which keeps the line they answer (romance-scene.css .vn-choices). */}
          {frame.choices.length > 0 && onChoose && <div className="vn-choices">
            <ChoicePoint minigame={frame.minigame} ready={ready} cast={{
              heroine: { emotion: reaction?.expression ?? resolveDialogueExpression(dialogueExpressions, storyId, frame), sceneId: active.episodeId,
                cityId: episode?.cityId ?? game.currentCityId },
              ...(opposite ? { person: <CharacterFigure characterId={opposite} /> } : {}),
            }}>
              <SceneChoices choices={choices} disabled={!ready} onChoose={onChoose} testId="epilogue-choice" />
            </ChoicePoint>
          </div>}
        </section>
        <DialogueWindowRestore state={windowVisibility} />
        <MiniGameSlot />
      </div>
    </div>
  );
}
