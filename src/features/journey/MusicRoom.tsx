import { useId, useMemo, useRef, useState } from "react";
import { battles, cityContents, dates, landmarks, scenes } from "../../content";
import type { SceneEntry } from "../../content/scene-schemas";
import sceneAudioJson from "../../content/generated/scene-audio.json";
import { getJourneyForCity } from "../../content/journeys";
import { sceneAudioSchema, type SceneAudio } from "../../content/scene-audio";
import { journeyMusicPlay, trackUseJa } from "../../audio/bgm";
import { Icon } from "../../components/icons";
import { Modal, ModalTitle } from "../../components/Modal";
import { useLineVoice, type LineVoiceState } from "../../components/useVoice";
import type { GameState } from "../../domain/game";
import { withNames } from "../romance/names";
import { heardTracks, heardVoices, sceneCompleted, type RoomVoice } from "./music-room";
import { visitedPlaceIdsIn } from "./visited-places";
import "./music-room.css";

/** content:build's index of the scenes' voices and tracks (scripts/scene-audio.ts); unreadable, the room is empty. */
const SCENE_AUDIO: SceneAudio = ((): SceneAudio => {
  const parsed = sceneAudioSchema.safeParse(sceneAudioJson as unknown);
  return parsed.success ? parsed.data : { schemaVersion: 1, stories: {} };
})();

/** What a completed scene is called in the room's list of voices: its title, its date's, battle's or place's name. */
function sceneLabelJa(scene: SceneEntry, game: Pick<GameState, "playerName" | "heroineName">): string {
  const city = (cityId: string) => cityContents[cityId]?.city.nameJa ?? cityId;
  const main = scene.main;
  const label = scene.title ??
    (!main ? (scene.kind === "tour_leg" ? "ツアーの移動" : "道中の会話")
      : "guide" in main ? `${landmarks.find((landmark) => landmark.id === main.guide)?.nameJa ?? main.guide}の案内`
      : "battle" in main ? battles.find((battle) => battle.id === main.battle)?.titleJa ?? main.battle
      : "date" in main ? dates.find((date) => date.id === main.date)?.titleJa ?? main.date
      : "epilogue" in main ? `${city(main.epilogue)}のエピローグ`
      : `${city(main.arrival)}に到着`);
  return withNames(label, game);
}

/** The voice the room plays, through the game's own voice player (useVoice.ts): its setting and volume, the music halved. */
function VoicePlayback({ voiceId, onState }: { voiceId: string; onState: (state: LineVoiceState | null) => void }) {
  useLineVoice(voiceId, true, false, onState);
  return null;
}

type VoicePlay = { id: string; count: number; state: LineVoiceState | "stopped" };

/**
 * 旅の音楽室 (2026-11-13 user decision; rules in music-room.ts), opened from 旅の記録 once a city is cleared: the tracks
 * of the places visited and of the scenes completed, and the heroine's voiced lines of those scenes with their text.
 * A track plays through the game's music player (GameApp asks for it: `playing`, `onPlay`), at 「BGMの大きさ」, with
 * no ambience; a voice through the voice player, at 「声の大きさ」. With 「BGMを流す」 or 「台詞の声を出す」 off its
 * buttons are off and say why. Closing the room gives the screen its own music back. Nothing is saved.
 */
export function MusicRoom({ game, playing, onPlay, bgmOn, voiceOn, onClose }: {
  game: GameState;
  /** The track the room plays now, or null. */
  playing: string | null;
  onPlay: (trackId: string | null) => void;
  bgmOn: boolean;
  voiceOn: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const { tracks, voices } = useMemo(() => {
    const journey = getJourneyForCity(game.currentCityId);
    const cityIds = journey?.cities.map((city) => city.id) ?? [game.currentCityId];
    const at = (cityId: string) => cityIds.indexOf(cityId);
    const reached = (cityId: string) => cityId === game.currentCityId || game.completedCityIds.includes(cityId) ||
      (at(cityId) >= 0 && at(cityId) < at(game.currentCityId));
    const done = scenes.filter((scene) => sceneCompleted(scene, game, reached));
    return {
      tracks: heardTracks({ play: journey ? journeyMusicPlay(journey.id) : null, visitedPlaceIds: cityIds.flatMap((cityId) => visitedPlaceIdsIn(game, cityId)),
        scenes: done, audio: SCENE_AUDIO, labelOf: trackUseJa }),
      voices: heardVoices({ scenes: done, audio: SCENE_AUDIO, names: (text) => withNames(text, game), sceneLabel: (scene) => sceneLabelJa(scene, game) }),
    };
  }, [game]);
  const [voice, setVoice] = useState<VoicePlay | null>(null);
  const voiceCount = useRef(0);
  function playVoice(line: RoomVoice) {
    voiceCount.current += 1;
    setVoice({ id: line.id, count: voiceCount.current, state: "busy" });
  }
  const voiceCountNow = voice?.count;
  const voiceState = (state: LineVoiceState | null) =>
    setVoice((last) => (last && last.count === voiceCountNow ? { ...last, state: state ?? "stopped" } : last));
  const playingLabel = tracks.find((track) => track.id === playing)?.labelJa;
  const voiceCountTotal = voices.reduce((sum, group) => sum + group.voices.length, 0);
  return <Modal labelledBy={titleId} onClose={onClose} className="music-room" settlePresses>
    <ModalTitle id={titleId} onClose={onClose}>旅の音楽室</ModalTitle>
    <p className="fine-print">旅で聞いた曲と、{game.heroineName}の声を、もう一度聞けます。閉じると、元の曲に戻ります。</p>
    <section className="music-room-part" aria-labelledby={`${titleId}-tracks`}>
      <h3 id={`${titleId}-tracks`}>曲（{tracks.length}）</h3>
      {!bgmOn && <p className="fine-print">設定の「BGMを流す」がオフなので、曲は流れません。</p>}
      {tracks.length ? <ul className="music-room-list">
        {tracks.map((track) => <li key={track.id}>
          <button type="button" className="music-room-item" aria-pressed={playing === track.id} disabled={!bgmOn}
            onClick={() => onPlay(playing === track.id ? null : track.id)}>
            <Icon name="music" /><span>{track.labelJa}</span>
          </button>
        </li>)}
      </ul> : <p>まだ聞いた曲はありません。</p>}
      {playing && <button type="button" className="secondary" onClick={() => onPlay(null)}>曲を止める</button>}
    </section>
    <section className="music-room-part" aria-labelledby={`${titleId}-voices`}>
      <h3 id={`${titleId}-voices`}>{game.heroineName}の声（{voiceCountTotal}）</h3>
      {!voiceOn && <p className="fine-print">設定の「台詞の声を出す」がオフなので、声は出ません。</p>}
      {voices.length ? voices.map((group) => <details key={group.sceneId} className="music-room-group">
        <summary>{group.labelJa}（{group.voices.length}）</summary>
        <ul className="music-room-list">
          {group.voices.map((line) => <li key={line.id}>
            <button type="button" className="music-room-item is-voice" disabled={!voiceOn}
              aria-pressed={voice?.id === line.id && voice.state === "busy"} onClick={() => playVoice(line)}>
              <Icon name="speaker" /><span>{line.textJa}</span>
            </button>
          </li>)}
        </ul>
      </details>) : <p>まだ聞いた声はありません。</p>}
    </section>
    {/* What plays now, for readers (the pressed buttons show it). */}
    <p className="sr-only" role="status">{playingLabel ? `曲：${playingLabel}を流しています。` : ""}</p>
    {voice && <VoicePlayback key={voice.count} voiceId={voice.id} onState={voiceState} />}
    <button type="button" className="secondary" onClick={onClose}>閉じる</button>
  </Modal>;
}
