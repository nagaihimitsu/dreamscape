import { useCallback, useId, useMemo, useRef, useState } from "react";
import { scenes, tagContext } from "../../content";
import usesJson from "../../content/generated/minigame-uses.json";
import { getJourneyForCity } from "../../content/journeys";
import { CanalScene } from "../../components/CanalScene";
import { CharacterFigure, CharacterPortrait } from "../../components/CharacterPortrait";
import { Modal, ModalTitle } from "../../components/Modal";
import { holdTaps } from "../../components/tap-hold";
import type { GameState } from "../../domain/game";
import { playerLatinName } from "../../domain/name-romaji";
import type { AnyMiniGameDefinition } from "../../minigames/contract";
import { ChoicePoint, type MiniGameStageCast } from "../../minigames/host/ChoicePoint";
import { MiniGameProvider, MiniGameSlot, type MiniGameEnvironment } from "../../minigames/host/MiniGameProvider";
import { miniGameDefinition } from "../../minigames/registry";
import { miniGameUseListSchema, miniGameUseTag, type MiniGameUse } from "../../minigames/uses";
import { withNames } from "../romance/names";
import { collectionGames, lookSceneId } from "./minigame-collection";
import { sceneGroup } from "./music-room";
import { SCENE_NAMES } from "./scene-names";
import "../romance/romance-scene.css";
import "./encounter.css";
import "./minigame-collection.css";

/** content:build's list of where the stories play each game (scripts/scene-walk.ts); unreadable, the collection is empty. */
const USES: readonly MiniGameUse[] = (() => {
  const parsed = miniGameUseListSchema.safeParse(usesJson as unknown);
  return parsed.success ? parsed.data : [];
})();

/** The stages opened in this page's life: each play's looks (its seed) differ from the last one's, never its outcome. */
let stagesOpened = 0;

/** A game as the collection lists it: its definition, the use it is played as, and where the journey plays it. */
type Entry = { definition: AnyMiniGameDefinition; use: MiniGameUse; cityId: string; whereJa: string; lookSceneId: string };

/** What a play of the collection gets from the game (GameApp): the settings it reads and the music it asks for. */
export type CollectionPlay = {
  /** ゲームの設定「ミニゲームをおまかせにする」: every play plays itself, as in the story. */
  auto: boolean;
  reduceMotion: boolean;
  /** A `quietScene` game lowers the screen's music while it plays (as in the story). */
  onQuiet: (quiet: boolean) => void;
  /** A game's own music (host/music.ts): its track while it plays, or the screen's again (null). */
  onMusic: (trackId: string | null) => void;
};

/**
 * ミニゲーム集 (2026-11-20 user decision; rules in minigame-collection.ts): opened beside 旅の音楽室 once the journey is
 * over (旅の思い出, the top of 旅の記録, a kept 旅の思い出), every mini-game of the journey, each on its stage over the list
 * (MiniGameStage). A dialog for viewing: 「× 閉じる」 in the title bar, a tap on the dimmed page around it, or Esc.
 * Nothing is saved: a play takes no choice and changes no save, record, relationship or setting.
 */
export function MiniGameCollection({ game, play, onClose }: { game: GameState; play: CollectionPlay; onClose: () => void }) {
  const titleId = useId();
  const entries = useMemo<Entry[]>(() => {
    const journey = getJourneyForCity(game.currentCityId);
    const cityIds = journey?.cities.map((city) => city.id) ?? [game.currentCityId];
    const sceneOf = (sceneId: string) => scenes.find((scene) => scene.id === sceneId);
    return collectionGames(USES, (sceneId) => sceneOf(sceneId)?.cityId, cityIds).flatMap(({ use, cityId }) => {
      const definition = miniGameDefinition(use.game);
      const scene = sceneOf(use.sceneId);
      if (!definition || !scene) return [];
      const whereJa = `${SCENE_NAMES.city(cityId)}・${withNames(sceneGroup(scene, SCENE_NAMES).labelJa, game)}`;
      return [{ definition, use, cityId, whereJa, lookSceneId: lookSceneId(scene) }];
    });
  }, [game]);
  const [playing, setPlaying] = useState<Entry | null>(null);
  const back = useCallback(() => setPlaying(null), []);
  return <>
    <Modal labelledBy={titleId} onClose={onClose} className="minigame-collection" settlePresses closeOnBackdrop>
      <ModalTitle id={titleId} onClose={onClose}>ミニゲーム集</ModalTitle>
      <p className="fine-print">この旅のミニゲームを、物語とは別に、何度でも遊べます。ここでの結果は、旅には残りません。</p>
      {play.auto && <p className="fine-print" data-testid="minigame-collection-auto">「ゲームの設定」の「ミニゲームをおまかせにする」がオンなので、どのゲームもおまかせで進みます。</p>}
      {entries.length ? <ul className="minigame-collection-list">
        {entries.map((entry) => <li key={entry.definition.id}>
          <button type="button" className="minigame-collection-item" data-testid={`minigame-collection-open-${entry.definition.id}`}
            onClick={() => setPlaying(entry)}>
            <span className="minigame-collection-name">{entry.definition.titleJa}
              {entry.definition.durationSec ? <span className="minigame-collection-length">約{entry.definition.durationSec}秒</span> : null}</span>
            <span className="minigame-collection-where">{entry.whereJa}</span>
          </button>
        </li>)}
      </ul> : <p>この旅には、遊べるミニゲームがありません。</p>}
    </Modal>
    {playing && <MiniGameStage entry={playing} game={game} play={play} onClose={back} />}
  </>;
}

/**
 * One game's stage, over the whole screen (a dialog over the list): its name and 「× 閉じる」 at the top, the scene's
 * picture (the use's `bg`) behind, she (and the person opposite her) on the stage, and where the story's choices would
 * be, the game's own start (ChoicePoint: its card, 練習する and the start); the play lies over it all as in the story,
 * with the use's pictures, keys and the person opposite her, and the player's names. The result card offers 「もう一回」 (play again at once) and 「次へ」 (back to the
 * list). Esc leaves a play that can be left (the host's 中断する), and closes the stage only while none is on.
 */
function MiniGameStage({ entry, game, play, onClose }: { entry: Entry; game: GameState; play: CollectionPlay; onClose: () => void }) {
  const titleId = useId();
  const scene = useRef<HTMLDivElement>(null);
  const [revision] = useState(() => ++stagesOpened);
  const { definition, use } = entry;
  const environment = useMemo<MiniGameEnvironment>(() => ({
    auto: play.auto,
    debug: false,
    reduceMotion: play.reduceMotion,
    names: { player: game.playerName, heroine: game.heroineName, playerLatin: playerLatinName(game.playerNameReading, game.playerName) },
    revision,
    context: tagContext,
    // No choice to take: 「次へ」 goes back to the list (the second tap of a double tap does not open the game under it).
    onOutcome: () => {
      holdTaps();
      onClose();
      return true;
    },
    backdrop: (backgroundId) => <CanalScene backgroundId={backgroundId} />,
    onQuiet: play.onQuiet,
    onMusic: play.onMusic,
    retry: true,
  }), [game.playerName, game.heroineName, game.playerNameReading, play.auto, play.reduceMotion, play.onQuiet, play.onMusic, onClose, revision]);
  const tag = useMemo(() => miniGameUseTag(use), [use]);
  const cast = useMemo<MiniGameStageCast>(() => ({
    heroine: { emotion: "neutral", sceneId: entry.lookSceneId, cityId: entry.cityId },
    ...(use.person ? { person: <CharacterFigure characterId={use.person} /> } : {}),
  }), [entry.lookSceneId, entry.cityId, use.person]);
  // Esc in a play is the host's (中断する where it can be left): the stage stays.
  const escape = () => {
    if (!scene.current?.querySelector(".minigame-layer")) onClose();
  };
  // Opened under the finger on the list: a moment with no press (the start waits for its own guard too).
  return <Modal labelledBy={titleId} onClose={escape} className="minigame-collection-stage" settlePresses>
    <MiniGameProvider value={environment}>
      <div ref={scene} className="vn-scene minigame-collection-scene" data-testid="minigame-collection-stage" data-game={definition.id}>
        <div className="vn-background">{use.bg ? <CanalScene backgroundId={use.bg} /> : null}</div>
        {/* She stands on the stage, and the person opposite her beside her, as in the story before the game (the encounter's
            two slots). */}
        <div className={`vn-character-layer${use.person ? " encounter-character-layer" : ""}`} data-two-characters={use.person ? true : undefined}>
          <div className={use.person ? "encounter-character-slot encounter-character-heroine" : undefined}>
            <CharacterPortrait characterId="heroine" sceneId={entry.lookSceneId} cityId={entry.cityId} />
          </div>
          {use.person && <div className="encounter-character-slot encounter-character-enemy"><CharacterPortrait characterId={use.person} /></div>}
        </div>
        <ModalTitle id={titleId} onClose={onClose} className="minigame-collection-band">{definition.titleJa}</ModalTitle>
        <div className="minigame-collection-window">
          <p className="minigame-collection-from">{entry.whereJa}</p>
          <ChoicePoint minigame={tag} ready cast={cast} />
        </div>
        <MiniGameSlot />
      </div>
    </MiniGameProvider>
  </Modal>;
}
