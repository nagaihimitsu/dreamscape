import { describe, expect, it } from "vitest";
import { lineMentions, standsAlone, termMentionNames, wordMentionNames, type MentionEntry } from "./mentions";
import { parseStoryTags } from "./tags";

const term = (id: string, ...names: string[]): MentionEntry => ({ kind: "term", id, names });
const word = (id: string, ...names: string[]): MentionEntry => ({ kind: "word", id, names });

describe("the tabs a line's text names (2026-11-28)", () => {
  it("finds a name standing as a word of its own, in the order of the text", () => {
    const entries = [term("chai", "チャイ"), term("monkey", "猿"), term("saree", "サリー")];
    expect(lineMentions("猿がチャイを狙っている。", entries).map((entry) => entry.id)).toEqual(["monkey", "chai"]);
    expect(lineMentions("サリーの裾に、チャイがこぼれた。", entries).map((entry) => entry.id)).toEqual(["saree", "chai"]);
  });

  it("passes over a name inside a longer katakana word, and a kanji name after a kanji", () => {
    const entries = [term("saree", "サリー"), term("cow", "牛"), term("haan", "ハーン")];
    expect(lineMentions("サリームの絵が、壁にあった。", entries)).toEqual([]);
    expect(lineMentions("水牛の群れが通る。", entries)).toEqual([]);
    expect(lineMentions("シャー・ジャハーンは座っていた。", entries)).toEqual([]);
    // A name after a word's end (a particle, a mark) counts; the same name later in the text, standing alone, counts too.
    expect(lineMentions("サリームの母は、サリーを着ていた。", entries).map((entry) => entry.id)).toEqual(["saree"]);
    expect(lineMentions("牛が、道の真ん中で寝ている。", entries).map((entry) => entry.id)).toEqual(["cow"]);
    expect(standsAlone("カーリー・バーオリー", 5, "バーオリー")).toBe(true);
  });

  it("lists one entry for two found by the same name (the first listed)", () => {
    const entries = [term("nihari_term", "ニハーリー"), word("nihari_word", "ニハーリー")];
    expect(lineMentions("ニハーリーって、朝ごはんなんだって。", entries).map((entry) => entry.id)).toEqual(["nihari_term"]);
  });

  it("searches a term by its name and other name, a word by its reading, unless mentionsJa says otherwise", () => {
    expect(termMentionNames({ nameJa: "階段井戸", aliasJa: "バーオリー" })).toEqual(["階段井戸", "バーオリー"]);
    expect(termMentionNames({ nameJa: "チャイ", aliasJa: null, mentionsJa: [] })).toEqual([]);
    expect(wordMentionNames({ reading: "バス" })).toEqual(["バス"]);
    expect(wordMentionNames({ reading: "バス", mentionsJa: [] })).toEqual([]);
  });

  it("reads # mention: off, and stops any other value", () => {
    expect(parseStoryTags(["mention: off"], { emotions: [] } as never).mentionOff).toBe(true);
    expect(() => parseStoryTags(["mention: on"], { emotions: [] } as never)).toThrow("Invalid mention tag");
  });
});
