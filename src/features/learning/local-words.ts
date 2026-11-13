import { cityContents, localWords as catalogWords, type LocalWord } from "../../content";
import { LOCAL_WORDS_KEY, type StorageLike } from "../../persistence";

/**
 * The words of the country (2026-11-11 user decision, 英語ノートの「その国の言葉」). A line's `# local_word: <id>` teaches
 * a word of learning/local-words.json when the line is shown in normal play; this device remembers it per journey
 * (LOCAL_WORDS_KEY: `{ "schemaVersion": 1, "ids": [...] }`, in the order learned), never the save. Learning a word again
 * changes nothing. A failing or unreadable storage never stops reading: the record then lives in this tab's memory only,
 * and an unreadable stored record is never overwritten (AGENTS.md). Debug sessions pass their own memory storage, so
 * Debug never reads or writes the normal record. No score and no mastery.
 */

const WORD_ID = /^[a-z][a-z0-9_]*$/u;

/** The words of a stored record, in the order learned; null for a text this build does not read (kept as it is). */
export function parseLearnedWords(raw: string | null): string[] | null {
  if (raw === null) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const { schemaVersion, ids, ...other } = data as Record<string, unknown>;
    if (schemaVersion !== 1 || Object.keys(other).length || !Array.isArray(ids) ||
        !ids.every((id): id is string => typeof id === "string" && WORD_ID.test(id)) || new Set(ids).size !== ids.length) return null;
    return ids;
  } catch {
    return null;
  }
}

/** The stored text of a record. */
export function serializeLearnedWords(ids: readonly string[]): string {
  return JSON.stringify({ schemaVersion: 1, ids });
}

/** The record after learning `ids`: the new ones added last, in their order; the same array when every one was known. */
export function learnWords(learned: readonly string[], ids: readonly string[]): readonly string[] {
  const known = new Set(learned);
  const added: string[] = [];
  for (const id of ids) {
    if (known.has(id)) continue;
    known.add(id);
    added.push(id);
  }
  return added.length ? [...learned, ...added] : learned;
}

/** The record a game screen keeps: the words in the order learned, and whether storage may be written. */
export type LearnedWords = { ids: readonly string[]; writable: boolean };

/**
 * Open the record in `storage` (a journey's scoped storage, or Debug's isolated memory). An empty slot starts a new
 * record; a storage that cannot be read, or a record this build does not read, gives an empty record kept in memory
 * only (never written over the stored one).
 */
export function openLearnedWords(storage: StorageLike): LearnedWords {
  let raw: string | null;
  try {
    raw = storage.getItem(LOCAL_WORDS_KEY);
  } catch {
    return { ids: [], writable: false };
  }
  const ids = parseLearnedWords(raw);
  return ids ? { ids, writable: true } : { ids: [], writable: false };
}

/**
 * Learn `ids` (those of the catalog, `known`) into `record` and write it; returns the words new to it. A failed write
 * keeps them in memory and stops no reading.
 */
export function rememberWords(storage: StorageLike, record: LearnedWords, ids: readonly string[],
  known: ReadonlySet<string> = new Set(catalogWords.map((word) => word.id))): string[] {
  const next = learnWords(record.ids, ids.filter((id) => known.has(id)));
  if (next === record.ids) return [];
  const added = next.slice(record.ids.length);
  record.ids = next;
  if (record.writable) {
    try {
      storage.setItem(LOCAL_WORDS_KEY, serializeLearnedWords(next));
    } catch {
      // Full or blocked storage: the words stay in this tab's memory.
    }
  }
  return added;
}

type FrameWords = { localWordIds?: readonly string[]; quiet?: string; seId?: string; photo?: { imageId: string; show?: "large" }; itemShow?: string } | null;
/** The parts of the game state that hold the story scenes' lines. */
export type SceneFrames = {
  activeEncounter: { frame: FrameWords } | null;
  activeEpilogue: { frame: FrameWords; kind?: string; logoComplete?: boolean } | null;
  activeTourism: { phase: string; frame: FrameWords } | null;
  activeBattle: { phase: string; frame: FrameWords } | null;
  activeDate: { frame: FrameWords } | null;
};

/**
 * The `# local_word:` words of the line on screen: the frame of the story scene GameApp shows (an encounter over the
 * epilogue, the sightseeing guide, the battle's talk, the date last); none outside a story scene, and none while an
 * arrival's title card covers its first line.
 */
export function lineWordsOnScreen(state: SceneFrames | null): readonly string[] {
  return lineFrameOnScreen(state)?.localWordIds ?? [];
}

/** The frame of the line on screen whose words lineWordsOnScreen reads (null outside a story scene). */
export function lineFrameOnScreen(state: SceneFrames | null): FrameWords {
  if (!state) return null;
  return state.activeEncounter ? state.activeEncounter.frame
    : state.activeEpilogue ? (state.activeEpilogue.kind === "arrival" && !state.activeEpilogue.logoComplete ? null : state.activeEpilogue.frame)
      : state.activeTourism ? (state.activeTourism.phase === "guide" ? state.activeTourism.frame : null)
        : state.activeBattle ? (state.activeBattle.phase === "dialogue" ? state.activeBattle.frame : null)
          : state.activeDate?.frame ?? null;
}

/** The notice of words just learned: 「ことばを覚えた：नमस्ते（ナマステ）」. */
export function learnedNoticeText(words: readonly Pick<LocalWord, "word" | "reading">[]): string {
  return `ことばを覚えた：${words.map((word) => `${word.word}（${word.reading}）`).join("、")}`;
}

/** One heading of 「その国の言葉」: a city (or the whole journey, for words without a city) and its words. */
export type LocalWordGroup = { key: string; titleJa: string; words: LocalWord[] };

/** The heading of the words that belong to no city. */
export const JOURNEY_WORDS_TITLE_JA = "この旅の言葉";

/**
 * 「その国の言葉」 of the English notes: the words learned, grouped by their city (the city's name; words without a city
 * under JOURNEY_WORDS_TITLE_JA), groups in the order their first word was learned, words in the order learned. A word
 * the catalog no longer has stays in the record and is not shown.
 */
export function localWordGroups(learned: readonly string[], catalog: readonly LocalWord[] = catalogWords,
  cityName: (cityId: string) => string | undefined = (cityId) => cityContents[cityId]?.city.nameJa): LocalWordGroup[] {
  const byId = new Map(catalog.map((word) => [word.id, word]));
  const groups = new Map<string, LocalWordGroup>();
  for (const id of learned) {
    const word = byId.get(id);
    if (!word) continue;
    const key = word.cityId === undefined ? "journey" : `city-${word.cityId}`;
    const group: LocalWordGroup = groups.get(key) ?? { key, titleJa: word.cityId === undefined ? JOURNEY_WORDS_TITLE_JA : cityName(word.cityId) ?? word.cityId, words: [] };
    groups.set(key, group);
    group.words.push(word);
  }
  return [...groups.values()];
}
