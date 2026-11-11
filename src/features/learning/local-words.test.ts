// The words of the country (2026-11-11 user decision): a line's `# local_word:` teaches a word as it is shown; this
// device remembers it per journey, apart from the save (learning a word again changes nothing); the English notes'
// 「その国の言葉」 lists the words by city in the order learned. Failing or unreadable storage never stops reading and an
// unreadable record is never overwritten. Read with the sample journey (fictional) for the catalog's own word.
import { describe, expect, it } from "vitest";
import type { LocalWord } from "../../content";
import { LOCAL_WORDS_KEY } from "../../persistence";
import { journeyStorage } from "../../persistence/journey-storage";
import {
  JOURNEY_WORDS_TITLE_JA, learnedNoticeText, learnWords, lineWordsOnScreen, localWordGroups, openLearnedWords, parseLearnedWords,
  rememberWords, serializeLearnedWords, type SceneFrames,
} from "./local-words";

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const writes: string[] = [];
  return {
    data, writes,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { writes.push(key); data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}

const source = { publisher: "辞書", title: "語の説明", url: "https://dictionary.test/word", checkedAt: "2026-11-11", claimType: "documented_fact" as const, claimJa: "語の意味の説明。" };
const word = (id: string, cityId?: string): LocalWord => ({ id, ...(cityId ? { cityId } : {}), word: id, reading: "ヨミ", meaningJa: "意味", sources: [source] });

describe("learning a word", () => {
  it("adds the new words last, in their order, and changes nothing for a word learned before", () => {
    const learned = learnWords([], ["a_word", "b_word"]);
    expect(learned).toEqual(["a_word", "b_word"]);
    expect(learnWords(learned, ["b_word", "a_word"])).toBe(learned);
    expect(learnWords(learned, [])).toBe(learned);
    expect(learnWords(learned, ["c_word", "a_word", "c_word"])).toEqual(["a_word", "b_word", "c_word"]);
  });

  it("reads a stored record back, and refuses one of another shape", () => {
    expect(parseLearnedWords(null)).toEqual([]);
    expect(parseLearnedWords(serializeLearnedWords(["a_word", "b_word"]))).toEqual(["a_word", "b_word"]);
    for (const raw of ["{broken", "[]", "null", JSON.stringify({ schemaVersion: 2, ids: [] }), JSON.stringify({ schemaVersion: 1, ids: ["Bad"] }),
      JSON.stringify({ schemaVersion: 1, ids: ["a_word", "a_word"] }), JSON.stringify({ schemaVersion: 1, ids: [], extra: true })])
      expect(parseLearnedWords(raw), raw).toBeNull();
  });
});

describe("the record on this device", () => {
  const known = new Set(["a_word", "b_word"]);

  it("writes a new word once, in the journey's own slot, and nothing for a word known or not in the catalog", () => {
    const base = memory();
    const storage = journeyStorage(base, "trip_a");
    const record = openLearnedWords(storage);
    expect(rememberWords(storage, record, ["a_word", "gone_word"], known)).toEqual(["a_word"]);
    expect(base.data.get("dreamscape.journey.trip_a.local-words.v1")).toBe(serializeLearnedWords(["a_word"]));
    expect(rememberWords(storage, record, ["a_word"], known)).toEqual([]);
    expect(base.writes).toHaveLength(1);
    expect(openLearnedWords(storage).ids).toEqual(["a_word"]);
    // Another journey has a record of its own.
    expect(openLearnedWords(journeyStorage(base, "trip_b")).ids).toEqual([]);
  });

  it("never overwrites a record it cannot read, and keeps reading when storage fails", () => {
    const unreadable = memory({ [LOCAL_WORDS_KEY]: "{broken" });
    const record = openLearnedWords(unreadable);
    expect(record).toEqual({ ids: [], writable: false });
    expect(rememberWords(unreadable, record, ["a_word"], known)).toEqual(["a_word"]);
    expect(record.ids).toEqual(["a_word"]);
    expect(unreadable.data.get(LOCAL_WORDS_KEY)).toBe("{broken");
    expect(unreadable.writes).toEqual([]);
    const blocked = { getItem: (): string | null => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    const blockedRecord = openLearnedWords(blocked);
    expect(blockedRecord.writable).toBe(false);
    expect(rememberWords(blocked, blockedRecord, ["b_word"], known)).toEqual(["b_word"]);
    const full = { getItem: () => null, setItem: () => { throw new Error("full"); } };
    const fullRecord = openLearnedWords(full);
    expect(rememberWords(full, fullRecord, ["a_word"], known)).toEqual(["a_word"]);
    expect(fullRecord.ids).toEqual(["a_word"]);
  });
});

describe("the words of the line on screen", () => {
  const frame = (ids?: string[]) => (ids ? { localWordIds: ids } : {});
  const none: SceneFrames = { activeEncounter: null, activeEpilogue: null, activeTourism: null, activeBattle: null, activeDate: null };

  it("reads the story scene GameApp shows, and nothing outside one", () => {
    expect(lineWordsOnScreen(null)).toEqual([]);
    expect(lineWordsOnScreen(none)).toEqual([]);
    expect(lineWordsOnScreen({ ...none, activeDate: { frame: frame(["a_word"]) } })).toEqual(["a_word"]);
    expect(lineWordsOnScreen({ ...none, activeDate: { frame: frame() } })).toEqual([]);
    // An encounter over the epilogue; the guide over the battle; the observation and the battle's question show no line.
    expect(lineWordsOnScreen({ ...none, activeEncounter: { frame: frame(["a_word"]) }, activeEpilogue: { frame: frame(["b_word"]) } })).toEqual(["a_word"]);
    expect(lineWordsOnScreen({ ...none, activeTourism: { phase: "guide", frame: frame(["a_word"]) }, activeBattle: { phase: "dialogue", frame: frame(["b_word"]) } }))
      .toEqual(["a_word"]);
    expect(lineWordsOnScreen({ ...none, activeTourism: { phase: "exploring", frame: null }, activeBattle: { phase: "dialogue", frame: frame(["b_word"]) } }))
      .toEqual([]);
    expect(lineWordsOnScreen({ ...none, activeBattle: { phase: "question", frame: frame(["b_word"]) } })).toEqual([]);
    expect(lineWordsOnScreen({ ...none, activeBattle: { phase: "dialogue", frame: frame(["b_word"]) } })).toEqual(["b_word"]);
  });

  it("waits for an arrival's title card to give way to its first line", () => {
    const arrival = { frame: frame(["a_word"]), kind: "arrival" };
    expect(lineWordsOnScreen({ ...none, activeEpilogue: arrival })).toEqual([]);
    expect(lineWordsOnScreen({ ...none, activeEpilogue: { ...arrival, logoComplete: true } })).toEqual(["a_word"]);
    expect(lineWordsOnScreen({ ...none, activeEpilogue: { frame: frame(["a_word"]), kind: "tour_leg" } })).toEqual(["a_word"]);
  });
});

describe("「その国の言葉」 of the English notes", () => {
  const catalog = [word("namaste_word", "delhi"), word("chai_word"), word("shukriya_word", "agra"), word("dhanyavad_word", "delhi")];
  const names: Record<string, string> = { delhi: "デリー", agra: "アーグラ" };
  const cityName = (cityId: string) => names[cityId];

  it("groups the words by city in the order learned, the cities in the order of their first word", () => {
    const groups = localWordGroups(["shukriya_word", "namaste_word", "chai_word", "dhanyavad_word"], catalog, cityName);
    expect(groups.map((group) => [group.titleJa, group.words.map((item) => item.id)])).toEqual([
      ["アーグラ", ["shukriya_word"]],
      ["デリー", ["namaste_word", "dhanyavad_word"]],
      [JOURNEY_WORDS_TITLE_JA, ["chai_word"]],
    ]);
    expect(new Set(groups.map((group) => group.key)).size).toBe(groups.length);
  });

  it("leaves out a word the catalog no longer has, and has nothing before a word is learned", () => {
    expect(localWordGroups(["gone_word", "chai_word"], catalog, cityName).map((group) => group.words.map((item) => item.id))).toEqual([["chai_word"]]);
    expect(localWordGroups([], catalog, cityName)).toEqual([]);
  });

  it("lists the sample's word under its city, with its reading, meaning, note and sources", () => {
    expect(localWordGroups(["smp_mihon_word_trisol"])).toMatchObject([{ titleJa: "見本の街", words: [{
      word: "Trisól", reading: "トリソル", meaningJa: expect.any(String), noteJa: expect.any(String),
      sources: [{ url: "https://example.com/dreamscape-sample" }],
    }] }]);
  });

  it("says the words just learned with their readings", () => {
    expect(learnedNoticeText([{ word: "नमस्ते", reading: "ナマステ" }])).toBe("ことばを覚えた：नमस्ते（ナマステ）");
    expect(learnedNoticeText([{ word: "नमस्ते", reading: "ナマステ" }, { word: "चाय", reading: "チャーイ" }]))
      .toBe("ことばを覚えた：नमस्ते（ナマステ）、चाय（チャーイ）");
  });
});
