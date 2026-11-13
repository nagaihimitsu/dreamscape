import { useEffect, useRef, useState, type ReactNode } from "react";
import audioLayersJson from "../content/generated/audio-layers.json";
import soundCatalogJson from "../content/generated/content/presentation/sounds.json";
import musicJson from "../content/generated/music.json";
import ambienceJson from "../content/generated/ambience.json";
import { audioLayersSchema } from "../content/audio-layers";
import { soundCatalogSchema } from "../content/sounds";
import { musicDataSchema } from "../content/music";
import { ambienceDataSchema } from "../content/ambience";
import { albumImages, cityContents, episodes, getCities, getCityContent, getCityStoryBackground, presentation } from "../content";
import { encounters } from "../content/encounters";
import { getJourney, getJourneyForCity } from "../content/journeys";
import { getTransportModes, type TransportMode } from "../content/transport";
import { SCENE_SHAKE_SIZES, WEATHER_KINDS, type SceneShakeSize, type WeatherKind } from "../content/tags";
import { holdSceneCues, playSe, playSound, useSoundEffectSettings } from "../audio/sound-effects";
import { playSceneMusic, useBgmSettings, useSceneMusic } from "../audio/bgm";
import { playSceneAmbience, useAmbienceSettings, useSceneAmbience } from "../audio/ambience";
import { canVibrate, useVibrationSetting, vibrate, type VibrationKind } from "../audio/vibration";
import type { MusicDuck } from "../audio/scene-music";
import { useLineVoice, useVoiceSettings, type LineVoiceState } from "../components/useVoice";
import { usePresentationSettings } from "../components/usePresentationSettings";
import { CanalScene } from "../components/CanalScene";
import { CharacterPortrait } from "../components/CharacterPortrait";
import { SceneTint, WeatherLayer } from "../components/SceneAtmosphere";
import { ItemShowLayer } from "../components/ItemShow";
import { DIALOGUE_WINDOW_ATTRIBUTE, shakeScene, shakeWindow } from "../components/DialogueText";
import { SceneNotebookTool } from "../components/SceneHeading";
import { NotebookCueContext } from "../components/notebook-cue";
import { JourneyHud } from "../app/JourneyHud";
import { useItemShowLeave } from "../app/useItemShowLeave";
import { ALBUM_PHOTO_NOTICE_MS, AlbumPhotoNotice, FIRST_ALBUM_PHOTO_NOTICE_MS, type AlbumPhotoNoticeState } from "../features/journey/AlbumPhotoNotice";
import { ChapterStamp } from "../features/journey/JourneyMoments";
import { chapterStampOf, type ChapterStampCard } from "../features/journey/journey-moments";
import { TravelTransition } from "../features/journey/TravelTransition";
import { rideRoute, type RideRoute } from "../features/journey/ride-map";
import { sceneTimeTint } from "../features/journey/time-of-day";
import type { GameState } from "../domain/game";
import { heldItemIds } from "../domain/item-changes";
import { cityStart } from "./scenario-builders";
import { defaultDebugCityId } from "./debug-state";
import {
  ambiencePlaces, audioGroups, backgroundChoices, budgetStep, filterVoiceGroups, itemToGain, itemToGive, layerLabelJa,
  missingSystemSounds, ROOM_TINTS, roomSound, voiceGroups, type RoomAudioEntry, type RoomAudioGroup, type RoomTintId,
} from "./effects-room";
import "../features/romance/romance-scene.css";
import "./effects-room.css";

// Debug's 「音と演出の見本」 (2026-11-13 user request): every registered sound, track, ambience track and voice to hear, and
// the effects to see on a small stage, without playing to them, to check them on a phone. It runs on the Debug page only
// (DebugMode shows it in place of 場面の確認, never beside a game), through the game's own players and components. It
// reads and writes no save, English notebook, presentation setting or Debug-mode key, and changes no game: its sound
// settings live in its own memory (the game's defaults to start with), its sample header shows a state built in memory
// by the scene builders and never saved. Everything it plays stops as it closes.

const parsedLayers = audioLayersSchema.safeParse(audioLayersJson);
const LAYERS = parsedLayers.success ? parsedLayers.data.layers : [];
const parsedSounds = soundCatalogSchema.safeParse(soundCatalogJson);
const parsedMusic = musicDataSchema.safeParse(musicJson);
const parsedAmbience = ambienceDataSchema.safeParse(ambienceJson);
/** Which list could not be read (the room then lists what it can). */
const LIST_PROBLEMS = [
  !parsedLayers.success && "音の層の一覧（audio-layers.json）",
  !parsedSounds.success && "効果音の一覧",
  !parsedMusic.success && "BGMの一覧",
  !parsedAmbience.success && "環境音の一覧",
].filter((item): item is string => !!item);

const usesOf = (entries: readonly { id: string; useJa: string }[]) => new Map(entries.map((entry): [string, string] => [entry.id, entry.useJa]));
const layerLabel = (layerId: string) => layerLabelJa(layerId, (journeyId) => getJourney(journeyId)?.nameJa);
const SOUND_GROUPS = audioGroups(LAYERS, "sounds", usesOf(parsedSounds.success ? parsedSounds.data.sounds : []), layerLabel);
const MUSIC_GROUPS = audioGroups(LAYERS, "music", usesOf(parsedMusic.success ? parsedMusic.data.tracks : []), layerLabel);
const AMBIENCE_GROUPS = audioGroups(LAYERS, "ambience", usesOf(parsedAmbience.success ? parsedAmbience.data.tracks : []), layerLabel);
const MISSING_SYSTEM_SOUNDS = missingSystemSounds(SOUND_GROUPS.flatMap((group) => group.entries.map((entry) => entry.id)));
const VOICE_LAYERS = LAYERS.filter((layer) => layer.voices.length > 0)
  .map((layer) => ({ layerId: layer.id, labelJa: layerLabel(layer.id), count: layer.voices.length, groups: voiceGroups(layer.voices) }));

/** A place's name and its city's, for the ambience's places. */
function placeName(placeId: string): string {
  for (const content of Object.values(cityContents)) {
    const place = content.travel.places.find((item) => item.id === placeId);
    if (place) return `${place.nameJa}（${content.city.nameJa}）`;
  }
  return placeId;
}
const AMBIENCE_PLACES = ambiencePlaces(parsedAmbience.success ? parsedAmbience.data.journeys : {}, placeName);

const WEATHER_LABELS: Readonly<Record<WeatherKind, string>> = { rain: "雨", dust: "砂ぼこり", colors: "色粉（ホーリー）", petals: "花びら" };
const SHAKE_LABELS: Readonly<Record<SceneShakeSize, string>> = { small: "小（small）", normal: "ふつう", large: "大（large）" };
const DUCKS: readonly { duck: MusicDuck; labelJa: string }[] = [
  { duck: "none", labelJa: "下げない" },
  { duck: "quiz", labelJa: "クイズの問い（こもる）" },
  { duck: "quiet", labelJa: "静かな行（# quiet:）" },
  { duck: "travel", labelJa: "移動の間" },
];
const VIBRATIONS: readonly { kind: VibrationKind; labelJa: string }[] = [
  { kind: "item", labelJa: "品物を手に入れた" },
  { kind: "clue", labelJa: "手がかりを記録した" },
  { kind: "shake", labelJa: "場面の揺れ" },
];
/** The cities whose effects the stage and the sample header can show (not a city still drawn on the map only). */
const STAGE_CITIES = getCities().filter((city) => city.productionStatus !== "prototype");

type MemoryStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void };
/** The room's own sound settings live here (never the device's ⚙設定). */
function memoryStorage(): MemoryStorage {
  const data = new Map<string, string>();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); } };
}

type VoicePlay = { id: string; count: number; state: LineVoiceState | "stopped" };
type Ride = { key: number; mode: TransportMode; route?: RideRoute };

/** The voice the room plays, through the game's own voice of a line (useVoice.ts): its volume, one at a time, the music halved. */
function VoicePlayback({ voiceId, onState }: { voiceId: string; onState: (state: LineVoiceState | null) => void }) {
  useLineVoice(voiceId, true, false, onState);
  return null;
}

export function EffectsRoom({ onClose }: { onClose: () => void }) {
  const [storage] = useState(memoryStorage);
  const settings = usePresentationSettings(storage);
  const sound = settings.value;
  const [vibrationAvailable] = useState(() => canVibrate(typeof navigator === "undefined" ? undefined : navigator));
  // The game's own setting hooks (as GameApp), with the room's settings.
  useVoiceSettings(sound.voice, sound.voiceVolume);
  useSoundEffectSettings(sound.se, sound.seVolume);
  useVibrationSetting(vibrationAvailable && sound.vibration);
  useBgmSettings(sound.bgm, sound.bgmVolume);
  useAmbienceSettings(sound.ambience, sound.bgmVolume);
  // A load in a Debug scene opened before may have held the scenes' cues (sound-effects.ts): the room's play at once.
  useEffect(() => {
    holdSceneCues(false);
  }, []);

  const [music, setMusic] = useState<string | null>(null);
  const [ambience, setAmbience] = useState<string | null>(null);
  const [duck, setDuck] = useState<MusicDuck>("none");
  const [ride, setRide] = useState<Ride | null>(null);
  const [voice, setVoice] = useState<VoicePlay | null>(null);
  const [reduce, setReduce] = useState(false);
  const [systemReduced] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const voiceCount = useRef(0);
  const rideCount = useRef(0);
  // What the room asks of the music and the ambience, as GameApp asks for its screen's.
  const asked = roomSound({ music, ambience, duck, riding: !!ride });
  useSceneMusic(asked.music);
  useSceneAmbience(asked.ambience);
  // Closing the room fades the music and the ambience to silence (the voice stops with its playback).
  useEffect(() => () => {
    playSceneMusic({ track: null, duck: "none" });
    playSceneAmbience({ track: null, duck: "none" });
  }, []);

  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, []);

  function playVoice(id: string) {
    voiceCount.current += 1;
    setVoice({ id, count: voiceCount.current, state: "busy" });
  }
  const voiceCountNow = voice?.count;
  const voiceState = (state: LineVoiceState | null) =>
    setVoice((last) => (last && last.count === voiceCountNow ? { ...last, state: state ?? "stopped" } : last));
  const musicUse = MUSIC_GROUPS.flatMap((group) => group.entries).find((entry) => entry.id === music)?.useJa;
  const ambienceUse = AMBIENCE_GROUPS.flatMap((group) => group.entries).find((entry) => entry.id === ambience)?.useJa;
  const sePercent = Math.round(sound.seVolume * 100);
  const bgmPercent = Math.round(sound.bgmVolume * 100);
  const voicePercent = Math.round(sound.voiceVolume * 100);

  return (
    <main className="effects-room" data-testid="effects-room">
      <header className="effects-room-head">
        <h1 ref={heading} tabIndex={-1}>音と演出の見本</h1>
        <button type="button" className="effects-room-close" onClick={onClose}>場面の確認へ戻る</button>
      </header>
      <p className="effects-room-note">
        Debug専用の確認の部屋です。登録されている効果音・BGM・環境音・声を一つずつ鳴らし、天気・揺れ・品物の札・上の帯の手応えなどの演出を、遊ばずにゲームと同じ部品で見られます。
        セーブ・英語ノート・⚙設定・ゲームの進行は何も変えません。ここでの音の設定はこの部屋だけのもので（初めはゲームの初期値）、閉じると流している音はすべて止まります。
      </p>
      {LIST_PROBLEMS.length > 0 && <p className="effects-room-off" role="alert">
        {LIST_PROBLEMS.join("・")}を読めませんでした。npm run content:build で作り直してから開き直してください。読めた一覧だけを出しています。
      </p>}
      <nav className="effects-room-jump" aria-label="この部屋の中">
        <a href="#effects-room-se">効果音</a>
        <a href="#effects-room-bgm">BGM</a>
        <a href="#effects-room-ambience">環境音</a>
        <a href="#effects-room-voice">声</a>
        <a href="#effects-room-stage">演出</a>
        <a href="#effects-room-vibration">振動</a>
      </nav>

      <section aria-labelledby="effects-room-se">
        <h2 id="effects-room-se">効果音</h2>
        <Toggle checked={sound.se} onChange={(on) => settings.update({ se: on })}>効果音を出す</Toggle>
        {sound.se ? <Volume label="効果音の大きさ" percent={sePercent} onChange={(value) => settings.update({ seVolume: value })} />
          : <Off>「効果音を出す」がオフなので、効果音は鳴りません（ゲームと同じ）。</Off>}
        <p>押すと、ゲームと同じ鳴らし方（同じ音は続けて鳴らさない・同時に4つまで）で1回鳴ります。</p>
        {SOUND_GROUPS.map((group) => <AudioGroupList key={group.layerId} group={group} disabled={!sound.se} onPress={(entry) => playSound(entry.id)} />)}
        {!SOUND_GROUPS.length && <p>登録されている効果音はありません。</p>}
        {MISSING_SYSTEM_SOUNDS.length > 0 && <p>一覧にない仕組みの音（ゲームでは鳴らずに進みます）：{MISSING_SYSTEM_SOUNDS.join("、")}</p>}
      </section>

      <section aria-labelledby="effects-room-bgm">
        <h2 id="effects-room-bgm">BGM</h2>
        <Toggle checked={sound.bgm} onChange={(on) => settings.update({ bgm: on })}>BGMを流す</Toggle>
        {sound.bgm ? <Volume label="BGMの大きさ" percent={bgmPercent} onChange={(value) => settings.update({ bgmVolume: value })} />
          : <Off>「BGMを流す」がオフなので、BGMは流れません（ゲームと同じ）。</Off>}
        <p>押した曲がゲームのBGMの流し方（1.5秒で入れ替わる・止めた所から続ける）で流れ続けます。止めるのは下の「流している音」から。</p>
        <h3>下げ方（BGMと環境音）</h3>
        <div className="effects-room-chips" role="group" aria-label="下げ方">
          {DUCKS.map((item) => <button key={item.duck} type="button" className="effects-room-chip" aria-pressed={duck === item.duck}
            onClick={() => setDuck(item.duck)}>{item.labelJa}</button>)}
        </div>
        <p>声が鳴っている間は、ゲームと同じくさらに半分になります。「移動の間」は、ゲームと同じく環境音を止めます。</p>
        {MUSIC_GROUPS.map((group) => <AudioGroupList key={group.layerId} group={group} disabled={!sound.bgm} pressed={music}
          onPress={(entry) => setMusic(entry.id)} />)}
        {!MUSIC_GROUPS.length && <p>登録されているBGMはありません。</p>}
      </section>

      <section aria-labelledby="effects-room-ambience">
        <h2 id="effects-room-ambience">環境音</h2>
        <Toggle checked={sound.ambience} onChange={(on) => settings.update({ ambience: on })}>環境音を流す</Toggle>
        {sound.ambience ? <p>BGMの大きさの半分で流れます（{Math.round(bgmPercent / 2)}%）。</p>
          : <Off>「環境音を流す」がオフなので、環境音は流れません（ゲームと同じ）。</Off>}
        {AMBIENCE_GROUPS.map((group) => <AudioGroupList key={group.layerId} group={group} disabled={!sound.ambience} pressed={ambience}
          onPress={(entry) => setAmbience(entry.id)}
          detail={(entry) => {
            const places = AMBIENCE_PLACES.get(entry.id);
            return places ? `使う地点：${places.join("・")}` : "地点の音にはなっていません（行の # ambience: で流れます）";
          }} />)}
        {!AMBIENCE_GROUPS.length && <p>登録されている環境音はありません。</p>}
      </section>

      <VoiceSection enabled={sound.voice} percent={voicePercent} voice={voice}
        onToggle={(on) => settings.update({ voice: on })} onVolume={(value) => settings.update({ voiceVolume: value })} onPlay={playVoice} />

      <EffectsStage reduce={reduce} systemReduced={systemReduced} onReduce={setReduce}
        onRide={(mode, route) => {
          rideCount.current += 1;
          setRide({ key: rideCount.current, mode, route });
        }} />

      <section aria-labelledby="effects-room-vibration">
        <h2 id="effects-room-vibration">振動</h2>
        {vibrationAvailable ? <Toggle checked={sound.vibration} onChange={(on) => settings.update({ vibration: on })}>振動する</Toggle>
          : <Off>このブラウザは振動できません。iPhone（Safari・Chrome とも）は、Webのページから振動させられません。Androidの Chrome で確かめてください。</Off>}
        {vibrationAvailable && !sound.vibration && <Off>「振動する」がオフなので、振動しません（ゲームと同じ）。</Off>}
        <div className="effects-room-chips">
          {VIBRATIONS.map((item) => <button key={item.kind} type="button" className="effects-room-chip" disabled={!vibrationAvailable || !sound.vibration}
            onClick={() => vibrate(item.kind)}>{item.labelJa}</button>)}
        </div>
        <p>動きを減らす設定でも振動はそのままです（ゲームと同じ）。</p>
      </section>

      {voice && <VoicePlayback key={voice.count} voiceId={voice.id} onState={voiceState} />}
      {ride && <TravelTransition key={ride.key} mode={ride.mode} route={ride.route} reduceMotion={reduce} onEnd={() => setRide(null)} />}

      {(music || ambience || voice?.state === "busy") && (
        <div className="effects-room-now" role="region" aria-label="流している音">
          {music && <NowPlaying label={`BGM：${music}${musicUse ? `（${musicUse}）` : ""}${sound.bgm ? "" : "・オフ"}`} onStop={() => setMusic(null)} />}
          {ambience && <NowPlaying label={`環境音：${ambience}${ambienceUse ? `（${ambienceUse}）` : ""}${sound.ambience ? "" : "・オフ"}${asked.ambience.track === null ? "・移動の間は止める" : ""}`}
            onStop={() => setAmbience(null)} />}
          {voice?.state === "busy" && <NowPlaying label={`声：${voice.id}`} onStop={() => setVoice(null)} />}
        </div>
      )}
    </main>
  );
}

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (on: boolean) => void; children: ReactNode }) {
  return <label className="effects-room-toggle">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{children}
  </label>;
}

function Volume({ label, percent, onChange }: { label: string; percent: number; onChange: (value: number) => void }) {
  return <label className="effects-room-volume">
    {label}
    <input type="range" aria-label={label} aria-valuetext={`${percent}%`} min={0} max={100} step={10} value={percent}
      onChange={(event) => onChange(Number(event.target.value) / 100)} />
    <span aria-hidden="true">{percent}%</span>
  </label>;
}

function Off({ children }: { children: ReactNode }) {
  return <p className="effects-room-off">{children}</p>;
}

function NowPlaying({ label, onStop }: { label: string; onStop: () => void }) {
  return <div className="effects-room-now-row"><span>{label}</span><button type="button" onClick={onStop}>停止</button></div>;
}

/** A layer's sounds, tracks or ambience tracks as buttons, each with its ID and use (and `detail`, e.g. its places). */
function AudioGroupList({ group, disabled, pressed, onPress, detail }: {
  group: RoomAudioGroup;
  disabled: boolean;
  /** The entry playing on (the music, the ambience): its button shows pressed. None for the sound effects. */
  pressed?: string | null;
  onPress: (entry: RoomAudioEntry) => void;
  detail?: (entry: RoomAudioEntry) => string;
}) {
  return <>
    <h3>{group.labelJa}（{group.entries.length}）</h3>
    <ul className="effects-room-sounds">
      {group.entries.map((entry) => <li key={entry.id}>
        <button type="button" className="effects-room-chip" disabled={disabled} aria-pressed={pressed === undefined ? undefined : pressed === entry.id}
          onClick={() => onPress(entry)}>
          <span className="effects-room-id">{entry.id}</span>
          {entry.useJa && <span className="effects-room-use">{entry.useJa}</span>}
          {detail && <span className="effects-room-use">{detail(entry)}</span>}
        </button>
      </li>)}
    </ul>
  </>;
}

const VOICE_STATES: Readonly<Record<VoicePlay["state"], string>> = {
  busy: "を再生しています。",
  ended: "を最後まで再生しました。",
  stopped: "は止まりました（止めたとき、ほかの声に替えたとき、読み込めないときもここで止まります）。",
};

function VoiceSection({ enabled, percent, voice, onToggle, onVolume, onPlay }: {
  enabled: boolean; percent: number; voice: VoicePlay | null;
  onToggle: (on: boolean) => void; onVolume: (value: number) => void; onPlay: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  return <section aria-labelledby="effects-room-voice">
    <h2 id="effects-room-voice">声</h2>
    <Toggle checked={enabled} onChange={onToggle}>台詞の声を出す</Toggle>
    {enabled ? <Volume label="声の大きさ" percent={percent} onChange={onVolume} />
      : <Off>「台詞の声を出す」がオフなので、声は鳴りません（ゲームと同じ）。</Off>}
    <p>旅行編の public/assets/voice/ にある声のファイルを、場面ごと（IDの最後の番号の前まで）に並べています。ゲームの声と同じ流し方で、1つずつ鳴り、鳴っている間はBGMと環境音が半分になります。</p>
    {VOICE_LAYERS.length > 0 && <label className="effects-room-field">
      IDで絞り込む
      <input type="search" value={query} placeholder="例：india_gate" onChange={(event) => setQuery(event.target.value)} />
    </label>}
    <p role="status">{voice ? `${voice.id} ${VOICE_STATES[voice.state]}` : ""}</p>
    {VOICE_LAYERS.map((layer) => {
      const groups = filterVoiceGroups(layer.groups, query);
      return <div key={layer.layerId}>
        <h3>{layer.labelJa}（{layer.count}）</h3>
        {!groups.length && <p>この旅行編に「{query.trim()}」を含む声はありません。</p>}
        {groups.map((group) => <div key={group.prefix} className="effects-room-voice-group">
          <p className="effects-room-id">{group.prefix}</p>
          <div className="effects-room-chips">
            {group.voices.map((item) => <button key={item.id} type="button" className="effects-room-chip" disabled={!enabled}
              aria-label={item.id} data-playing={(voice?.id === item.id && voice.state === "busy") || undefined}
              onClick={() => onPlay(item.id)}>{item.labelJa}</button>)}
          </div>
        </div>)}
      </div>;
    })}
    {!VOICE_LAYERS.length && <p>声のファイルはありません。</p>}
  </section>;
}

type Demo = { game: GameState | null; error: string };

/** The sample header's state: the city's start, as Debug's scenes build it, in memory only (never saved). */
function demoOf(cityId: string): Demo {
  try {
    return { game: cityStart(cityId), error: "" };
  } catch (error) {
    return { game: null, error: error instanceof Error ? error.message : "見本の状態を作れませんでした。" };
  }
}

/**
 * The effects on a small stage as a story scene draws them, under the game's own header: the real components and rules
 * with plain values (no game is played). The header's state is the city's start built in memory; its changes here are
 * the room's only and never saved.
 */
function EffectsStage({ reduce, systemReduced, onReduce, onRide }: {
  reduce: boolean; systemReduced: boolean; onReduce: (on: boolean) => void;
  onRide: (mode: TransportMode, route: RideRoute | undefined) => void;
}) {
  const [cityId, setCityId] = useState(() => (STAGE_CITIES.some((city) => city.id === defaultDebugCityId) ? defaultDebugCityId : STAGE_CITIES[0]?.id ?? ""));
  const content = cityId ? getCityContent(cityId) : undefined;
  const hotelPlaceId = content?.travelSettings.hotelPlaceId;
  const backgrounds = content ? backgroundChoices(content.travel.places, getCityStoryBackground(cityId, content.travelSettings.hotelPlaceId), presentation.backgrounds) : [];
  const [background, setBackground] = useState(() => backgrounds[0]?.id);
  const [weather, setWeather] = useState<WeatherKind | undefined>(undefined);
  const [tintId, setTintId] = useState<RoomTintId>("day");
  const [portrait, setPortrait] = useState(true);
  const [breathStill, setBreathStill] = useState(false);
  const cityItems = encounters.items.filter((item) => item.cityId === cityId);
  const [itemId, setItemId] = useState<string | undefined>(() => cityItems[0]?.id);
  const [itemShow, setItemShow] = useState<string | undefined>(undefined);

  const [demo, setDemo] = useState<Demo>(() => demoOf(cityId));
  const game = demo.game;
  const [replaced, setReplaced] = useState(0);
  const [seenItems, setSeenItems] = useState<ReadonlySet<string>>(() => new Set(game ? heldItemIds(game.inventory) : []));
  const [englishNew, setEnglishNew] = useState(false);
  const [clue, setClue] = useState({ gleam: 0, unseen: false });
  const [photoNotice, setPhotoNotice] = useState<AlbumPhotoNoticeState | null>(null);
  const [stamp, setStamp] = useState<{ key: number; card: ChapterStampCard } | null>(null);
  const [status, setStatus] = useState("");
  const line = useRef<HTMLParagraphElement>(null);
  const itemLeave = useItemShowLeave(itemShow, game?.inventory, replaced);

  // The photo card goes after its time, as GameApp's does.
  useEffect(() => {
    if (!photoNotice) return;
    const timer = window.setTimeout(() => setPhotoNotice(null), photoNotice.first ? FIRST_ALBUM_PHOTO_NOTICE_MS : ALBUM_PHOTO_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [photoNotice]);

  /** Starts the sample over for `nextCity` (its start, nothing held new): what it brings has no cue, as after a load. */
  function restart(nextCity: string) {
    const next = demoOf(nextCity);
    setDemo(next);
    setReplaced((count) => count + 1);
    setSeenItems(new Set(next.game ? heldItemIds(next.game.inventory) : []));
    setEnglishNew(false);
    setClue({ gleam: 0, unseen: false });
    setPhotoNotice(null);
    setItemShow(undefined);
    setStatus("");
  }
  function chooseCity(nextCity: string) {
    const nextContent = getCityContent(nextCity);
    setCityId(nextCity);
    setBackground(backgroundChoices(nextContent.travel.places, getCityStoryBackground(nextCity, nextContent.travelSettings.hotelPlaceId),
      presentation.backgrounds)[0]?.id);
    setItemId(encounters.items.find((item) => item.cityId === nextCity)?.id);
    restart(nextCity);
  }
  const change = (next: (state: GameState) => GameState) => setDemo((last) => (last.game ? { ...last, game: next(last.game) } : last));
  const cityItemIds = cityItems.map((item) => item.id);
  const gain = game ? itemToGain(cityItemIds, game.inventory) : undefined;
  const give = game ? itemToGive(cityItemIds, game.inventory) : undefined;
  const place = content?.travel.places.find((item) => item.id === game?.travel.currentPlaceId);
  const otherPlaceId = content?.travel.places.find((item) => item.id !== hotelPlaceId)?.id;
  const route = game ? rideRoute(game, hotelPlaceId, otherPlaceId) : undefined;
  const firstEpisode = episodes.find((episode) => episode.cityId === cityId);
  const journeyId = getJourneyForCity(cityId)?.id;
  const albumImage = albumImages.find((image) => image.journeyId === journeyId) ?? albumImages[0];
  const tint = ROOM_TINTS.find((item) => item.id === tintId) ?? ROOM_TINTS[1];
  const notShown = (text: string) => () => setStatus(`${text}は、見本では開きません。`);

  function showPhoto(first: boolean) {
    if (!albumImage || !hotelPlaceId) return;
    setPhotoNotice((last) => ({ id: (last?.id ?? 0) + 1, first,
      photo: { imageId: albumImage.id, cityId, day: 1, minute: 600, placeId: hotelPlaceId, storyId: "effects_room" } }));
    playSe("album_photo");
  }

  return <section aria-labelledby="effects-room-stage">
    <h2 id="effects-room-stage">演出</h2>
    <p>ゲームと同じ部品で、会話の場面の上に出る演出と上の帯の手応えを出します。押してもゲームの状態は変わらず、何も保存しません。</p>
    <div className="effects-room-fields">
      <label className="effects-room-field">
        見本の都市
        <select value={cityId} onChange={(event) => chooseCity(event.target.value)}>
          {STAGE_CITIES.map((city) => <option key={city.id} value={city.id}>{getJourneyForCity(city.id)?.nameJa ?? ""}・{city.nameJa}</option>)}
        </select>
      </label>
      <label className="effects-room-field">
        背景
        <select value={background ?? ""} onChange={(event) => setBackground(event.target.value)}>
          {backgrounds.map((item) => <option key={item.id} value={item.id}>{item.nameJa}</option>)}
        </select>
      </label>
    </div>
    {demo.error && <p className="effects-room-off" role="alert">上の帯の見本を作れませんでした：{demo.error}</p>}

    <div className={`effects-room-screen${reduce ? " reduce-motion" : ""}`} data-breath={breathStill ? "still" : undefined}>
      {game && <JourneyHud game={game} place={place} view="all" replaced={replaced} seenItemIds={seenItems}
        onItemsSeen={(ids) => setSeenItems((seen) => new Set([...seen, ...ids]))} englishNew={englishNew}
        holdNotices={!!photoNotice || !!itemShow || !!itemLeave} itemFlight={itemLeave}
        onSave={() => {
          playSe("save");
          setStatus("セーブの印と音だけを出しました（何も保存していません）。");
          return true;
        }}
        onLoad={notShown("ロード")} onRecords={notShown("旅の記録")} onAlbum={notShown("アルバム")} onEnglish={notShown("英語ノート")}
        onSettings={notShown("ゲームの設定")} />}
      {game && <NotebookCueContext.Provider value={clue}>
        <SceneNotebookTool onClick={() => {
          setClue((last) => ({ ...last, unseen: false }));
          setStatus("手がかり帳は、見本では開きません（点は消えました）。");
        }} />
      </NotebookCueContext.Provider>}
      <div className="effects-room-stage-area">
        <div className="vn-scene effects-room-stage">
          <div className="vn-background">
            <CanalScene backgroundId={background} />
            <SceneTint color={sceneTimeTint(tint.minute, tint.off)} />
          </div>
          <WeatherLayer weather={weather} />
          <ItemShowLayer itemId={itemShow} />
          <div className="vn-character-layer">
            {portrait && <CharacterPortrait characterId="heroine" cityId={cityId} />}
          </div>
          <div className="vn-dialogue effects-room-window" {...{ [DIALOGUE_WINDOW_ATTRIBUTE]: "" }}>
            <div className="vn-window-head"><span className="speaker">見本</span></div>
            <div className="vn-window-body">
              <p ref={line} className="dialogue-text">見本の台詞です。揺れ・窓の揺れ・品物の札は、この場面に出ます。</p>
            </div>
          </div>
        </div>
        <div className="scene-notices effects-room-notices"><AlbumPhotoNotice notice={photoNotice} /></div>
      </div>
    </div>
    {stamp && <ChapterStamp key={stamp.key} stamp={stamp.card} reduceMotion={reduce} onStart={() => undefined} onEnd={() => setStamp(null)} />}

    <label className="effects-room-toggle">
      <input type="checkbox" checked={reduce} onChange={(event) => onReduce(event.target.checked)} />
      動きを減らす形で見る（この見本だけ。ゲームの「演出を短縮する」と同じ形）
    </label>
    {systemReduced && <Off>この端末は「視差効果を減らす」（動きを減らす）がオンなので、オフにしても動きを減らす形で出ます。</Off>}

    <h3>天気（# weather:）</h3>
    <div className="effects-room-chips">
      {WEATHER_KINDS.map((kind) => <button key={kind} type="button" className="effects-room-chip" aria-pressed={weather === kind}
        onClick={() => setWeather(kind)}>{WEATHER_LABELS[kind]}</button>)}
      <button type="button" className="effects-room-chip" aria-pressed={weather === undefined} onClick={() => setWeather(undefined)}>止める（stop）</button>
    </div>

    <h3>揺れ（# shake）</h3>
    <div className="effects-room-chips">
      {SCENE_SHAKE_SIZES.map((size) => <button key={size} type="button" className="effects-room-chip"
        onClick={() => {
          shakeScene(line.current, size);
          vibrate("shake");
        }}>{SHAKE_LABELS[size]}</button>)}
      <button type="button" className="effects-room-chip" onClick={() => {
        if (line.current) shakeWindow(line.current);
      }}>窓（# shake: window）</button>
    </div>
    <p>場面の揺れは絵・天気・人物を揺らし、短く振動します（振動は下の「振動」の設定による）。窓の揺れは台詞の窓だけです。</p>

    <h3>時刻の色（# tint:）</h3>
    <div className="effects-room-chips">
      {ROOM_TINTS.map((item) => <button key={item.id} type="button" className="effects-room-chip" aria-pressed={tintId === item.id}
        onClick={() => setTintId(item.id)}>{item.labelJa}</button>)}
    </div>
    <p>会話の場面の絵に、ゲームの時計の色を自由時間の半分の濃さで重ねます（昼は色なし）。</p>

    <h3>品物の札（# item_show:）</h3>
    {cityItems.length ? <>
      <label className="effects-room-field">
        品物
        <select value={itemId ?? ""} onChange={(event) => setItemId(event.target.value)}>
          {cityItems.map((item) => <option key={item.id} value={item.id}>{item.nameJa}（{item.id}）</option>)}
        </select>
      </label>
      <div className="effects-room-chips">
        <button type="button" className="effects-room-chip" disabled={!itemId || itemShow === itemId} onClick={() => setItemShow(itemId)}>札を出す</button>
        <button type="button" className="effects-room-chip" disabled={!itemShow} onClick={() => setItemShow(undefined)}>次の行へ</button>
        <button type="button" className="effects-room-chip" disabled={!itemShow || !game} onClick={() => {
          const shown = itemShow;
          if (!shown) return;
          // The line's # give: with it: the item is held as the line goes, so its card flies into the bag.
          change((state) => ({ ...state, inventory: { ...state.inventory, [shown]: "held" } }));
          setItemShow(undefined);
        }}>渡して次の行へ</button>
      </div>
      <p>「次の行へ」で、持っていない品物の札はその場で消え、持っている品物の札は上の帯の所持品へ飛びます。「渡して次の行へ」は、その行で品物を渡したときの形です。</p>
    </> : <p>この都市には品物がありません。ほかの都市を選んでください。</p>}

    <h3>人物</h3>
    <label className="effects-room-toggle"><input type="checkbox" checked={portrait} onChange={(event) => setPortrait(event.target.checked)} />ヒロインを出す</label>
    <label className="effects-room-toggle"><input type="checkbox" checked={breathStill} disabled={!portrait}
      onChange={(event) => setBreathStill(event.target.checked)} />呼吸を止めて比べる（ゲームでは止めない）</label>
    <p>立ち絵は、ゲームと同じく1.5pxだけゆっくり上下します（動きを減らす形では止まります）。</p>

    <h3>上の帯の手応え</h3>
    {game ? <>
      <div className="effects-room-chips">
        <button type="button" className="effects-room-chip" onClick={() => change((state) => ({ ...state, travelBudget: state.travelBudget + budgetStep(state.travelBudget) }))}>予算が増える</button>
        <button type="button" className="effects-room-chip" disabled={game.travelBudget <= 0}
          onClick={() => change((state) => ({ ...state, travelBudget: Math.max(0, state.travelBudget - budgetStep(state.travelBudget)) }))}>予算が減る</button>
        <button type="button" className="effects-room-chip" onClick={() => change((state) => ({ ...state, ap: state.ap + 1 }))}>APが増える</button>
        <button type="button" className="effects-room-chip" disabled={game.ap <= 0} onClick={() => change((state) => ({ ...state, ap: Math.max(0, state.ap - 1) }))}>APが減る</button>
        <button type="button" className="effects-room-chip" disabled={!gain}
          onClick={() => gain && change((state) => ({ ...state, inventory: { ...state.inventory, [gain]: "held" } }))}>品物を手に入れる</button>
        <button type="button" className="effects-room-chip" disabled={!give}
          onClick={() => give && change((state) => ({ ...state, inventory: { ...state.inventory, [give]: "gifted" } }))}>品物を渡す</button>
        <button type="button" className="effects-room-chip" onClick={() => {
          // As GameApp, for a clue recorded in play.
          setClue((last) => ({ gleam: last.gleam + 1, unseen: true }));
          playSe("clue_new");
          vibrate("clue");
        }}>手がかりを記録</button>
        <button type="button" className="effects-room-chip" aria-pressed={englishNew} onClick={() => setEnglishNew((on) => !on)}>英語ノートの点</button>
        <button type="button" className="effects-room-chip" onClick={() => restart(cityId)}>元に戻す</button>
      </div>
      <p>セーブの印は、上の帯の「設定」から「セーブ」で出ます（何も保存しません）。所持品の「NEW」の点は、所持品を開くと消えます。
        {!cityItems.length && "この都市には品物がないので、品物の手応えはほかの都市で見られます。"}</p>
      <p role="status">{status}</p>
    </> : <p>上の帯の見本がないため、この欄は使えません。</p>}

    <h3>画面の演出</h3>
    <div className="effects-room-chips">
      <button type="button" className="effects-room-chip" disabled={!firstEpisode || !game} onClick={() => {
        const card = firstEpisode && game ? chapterStampOf(game, firstEpisode.id) : null;
        if (card) setStamp((last) => ({ key: (last?.key ?? 0) + 1, card }));
      }}>話の終わりの「完」の判</button>
      <button type="button" className="effects-room-chip" disabled={!albumImage || !hotelPlaceId} onClick={() => showPhoto(false)}>写真の札</button>
      <button type="button" className="effects-room-chip" disabled={!albumImage || !hotelPlaceId} onClick={() => showPhoto(true)}>写真の札（旅で最初の1枚）</button>
    </div>
    {!albumImage && <p>アルバムの絵が一つもないため、写真の札は出せません。</p>}
    <h3>移動の演出（小さな地図つき）</h3>
    <div className="effects-room-chips">
      {(cityId ? getTransportModes(cityId) : []).map((mode) => <button key={mode.id} type="button" className="effects-room-chip"
        onClick={() => onRide(mode, route)}>{mode.nameJa}</button>)}
    </div>
    <p>{route ? `${route.from.nameJa}から${route.to.nameJa}への移動として出します。` : "地図の札に出す2つの地点が見つからないため、地図なしで出します。"}
      移動の間、BGMはゲームと同じく下がり、環境音は止まります。</p>

    <h3>ゲームの中で見るもの</h3>
    <ul className="effects-room-elsewhere">
      <li>新しい行き先の札が列に加わる動き：自由時間の写真の札の列で、物語が開いた行き先（when: がかなったデート・夜だけの場面・ツアー）が初めて並んだとき。</li>
      <li>夜の「今日の一語」：その日にエピソードを終えた夜の画面のいちばん下。</li>
      <li>出発の確認の品物：「{"{都市}"}へ出発」の確認（持っていく品物・置いていく品物）。</li>
      <li>タイトル画面の時間帯の色：タイトル画面の絵（端末の時刻で決まる）。</li>
    </ul>
  </section>;
}
