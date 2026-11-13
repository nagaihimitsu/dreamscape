import { CORE_LAYER_ID, type AudioLayer } from "../content/audio-layers";
import { SYSTEM_SOUND_IDS, type SystemSoundId } from "../content/sounds";
import type { MusicDuck, SceneMusic } from "../audio/scene-music";
import type { GameState } from "../domain/game";

// Debug's 「音と演出の見本」 (2026-11-13 user request; EffectsRoom.tsx): the rules of its lists and of what it asks of the
// players. Pure: nothing here plays, reads a save or changes a game.

/** One sound, track or ambience track of the room's lists: its ID and what it is for (its list's `useJa`). */
export type RoomAudioEntry = { id: string; useJa?: string };
/** A layer's part of a list: 共通 (the shared layer) or a journey's own. */
export type RoomAudioGroup = { layerId: string; labelJa: string; entries: RoomAudioEntry[] };

/** A layer's name in the room: 「共通」 for the shared layer, else its journey's name (`journeyName`), else its ID. */
export function layerLabelJa(layerId: string, journeyName: (journeyId: string) => string | undefined): string {
  return layerId === CORE_LAYER_ID ? "共通" : journeyName(layerId) ?? layerId;
}

/**
 * The room's list of one kind (`kind`: the sound effects, the music or the ambience) by layer, in the layers' order
 * (共通 first), leaving out the layers with none; each entry with its use from `useOf` (by ID) when it has one.
 */
export function audioGroups(layers: readonly AudioLayer[], kind: "sounds" | "music" | "ambience",
  useOf: ReadonlyMap<string, string>, labelOf: (layerId: string) => string): RoomAudioGroup[] {
  return layers.filter((layer) => layer[kind].length > 0).map((layer) => ({
    layerId: layer.id,
    labelJa: labelOf(layer.id),
    entries: layer[kind].map((id): RoomAudioEntry => {
      const useJa = useOf.get(id);
      return useJa === undefined ? { id } : { id, useJa };
    }),
  }));
}

/** The sounds the game plays by itself (SYSTEM_SOUND_IDS) that no list registers: the game skips them in silence. */
export function missingSystemSounds(registered: Iterable<string>): SystemSoundId[] {
  const ids = new Set(registered);
  return SYSTEM_SOUND_IDS.filter((id) => !ids.has(id));
}

/**
 * The names of the places that play each ambience track as their own (every journey's `play.places`, ambience.json),
 * by track ID, each name once, in the lists' order.
 */
export function ambiencePlaces(journeys: Readonly<Record<string, { places: Readonly<Record<string, string>> }>>,
  placeName: (placeId: string) => string): Map<string, string[]> {
  const places = new Map<string, string[]>();
  for (const play of Object.values(journeys))
    for (const [placeId, trackId] of Object.entries(play.places)) {
      const names = places.get(trackId) ?? [];
      const name = placeName(placeId);
      if (!names.includes(name)) names.push(name);
      places.set(trackId, names);
    }
  return places;
}

/** A scene's voices: their ID without the last `_<number>`, and each voice with its number (or its whole ID). */
export type VoiceGroup = { prefix: string; voices: { id: string; labelJa: string }[] };

const NUMBERED_VOICE = /^(.+)_(\d+)$/u;

/**
 * A journey's voices grouped by their scene, as the files are named (`gt_delhi_date_india_gate_001` →
 * `gt_delhi_date_india_gate`, 「001」), the IDs in order; an ID without a number is a group of its own.
 */
export function voiceGroups(ids: readonly string[]): VoiceGroup[] {
  const groups = new Map<string, VoiceGroup>();
  for (const id of [...ids].sort()) {
    const match = NUMBERED_VOICE.exec(id);
    const prefix = match ? match[1] : id;
    const group = groups.get(prefix) ?? { prefix, voices: [] };
    groups.set(prefix, group);
    group.voices.push({ id, labelJa: match ? match[2] : id });
  }
  return [...groups.values()];
}

/**
 * The groups whose voices match `query` (part of an ID; spaces around it ignored, any case): a group whose name
 * matches keeps all its voices, another only those whose ID matches. Every group for an empty query.
 */
export function filterVoiceGroups(groups: readonly VoiceGroup[], query: string): VoiceGroup[] {
  const wanted = query.trim().toLowerCase();
  if (!wanted) return [...groups];
  return groups.flatMap((group) => {
    if (group.prefix.includes(wanted)) return [group];
    const voices = group.voices.filter((voice) => voice.id.includes(wanted));
    return voices.length ? [{ ...group, voices }] : [];
  });
}

/**
 * What the room asks of the music and the ambience: the chosen tracks lowered as chosen (`duck`), and under a ride's
 * visual (`riding`, its demo) as the game lowers them for a ride. As in the game, the ambience does not play under a
 * ride (src/audio/scene-ambience.ts sceneAmbience), so the lowering for a ride silences it.
 */
export function roomSound(choice: { music: string | null; ambience: string | null; duck: MusicDuck; riding: boolean }): { music: SceneMusic; ambience: SceneMusic } {
  const duck: MusicDuck = choice.riding ? "travel" : choice.duck;
  return {
    music: { track: choice.music, duck },
    ambience: duck === "travel" ? { track: null, duck: "none" } : { track: choice.ambience, duck },
  };
}

/** The times the room shows the scene's colour of the time of day at (the game clock's minutes), and the tint switched off. */
export const ROOM_TINTS = [
  { id: "morning", labelJa: "朝 8:00", minute: 8 * 60, off: false },
  { id: "day", labelJa: "昼 13:00", minute: 13 * 60, off: false },
  { id: "evening", labelJa: "夕方 17:00", minute: 17 * 60, off: false },
  { id: "night", labelJa: "夜 21:00", minute: 21 * 60, off: false },
  { id: "off", labelJa: "消す（# tint: off）", minute: 21 * 60, off: true },
] as const;
export type RoomTintId = (typeof ROOM_TINTS)[number]["id"];

/**
 * The backgrounds to try the effects on: the city's own first (`first`, the city's story background), then its places'
 * (`places`, in order), each once, only those `backgrounds` has; all of `backgrounds` when the city names none.
 */
export function backgroundChoices(places: readonly { backgroundId?: string }[], first: string | undefined,
  backgrounds: Readonly<Record<string, { nameJa: string }>>): { id: string; nameJa: string }[] {
  const ids = [...new Set([first, ...places.map((place) => place.backgroundId)])]
    .filter((id): id is string => id !== undefined && Object.hasOwn(backgrounds, id));
  return (ids.length ? ids : Object.keys(backgrounds)).map((id) => ({ id, nameJa: backgrounds[id].nameJa }));
}

/** The sample header's next item to gain: the first of the city's items (`itemIds`) not held now (one given away comes back). */
export function itemToGain(itemIds: readonly string[], inventory: GameState["inventory"]): string | undefined {
  return itemIds.find((id) => inventory[id] !== "held");
}

/** The sample header's next item to give away: the first of the city's items held now. */
export function itemToGive(itemIds: readonly string[], inventory: GameState["inventory"]): string | undefined {
  return itemIds.find((id) => inventory[id] === "held");
}

/** How much the sample header's budget rises or falls at a press: a quarter of it (at least 1), so its coins fly. */
export const budgetStep = (budget: number): number => Math.max(1, Math.round(Math.max(0, budget) / 4));
