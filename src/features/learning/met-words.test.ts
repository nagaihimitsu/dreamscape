// 「前に出た単語の印」 (2026-11-11 user decision): which words of a later question's English are marked as met before.
import { describe, expect, it } from "vitest";
import { englishTokens } from "./InteractiveEnglish";
import { markMetWords, metWordKey, metWordKeys } from "./met-words";

const answered = [
  { id: "q1", vocabularyJa: [{ word: "kept" }] },
  { id: "q3", vocabularyJa: [{ word: "keeper" }, { word: "rings" }, { word: "keep time" }] },
];
/** The met segments of `text` (only those with a word). */
const marked = (text: string, met: ReadonlySet<string>, vocabulary: { word: string; meaning: string }[] = []) =>
  markMetWords(englishTokens(text, vocabulary), met).filter((segment) => segment.met).map((segment) => segment.text);

describe("words met before", () => {
  it("are the words of the questions answered, without the question on screen", () => {
    expect([...metWordKeys(answered)]).toEqual(["kept", "keeper", "ring", "keep time"]);
    expect([...metWordKeys(answered, "q3")]).toEqual(["kept"]);
    expect(metWordKeys([]).size).toBe(0);
  });

  it("match whole words whatever their case, with or without one plural -s or a possessive", () => {
    const met = metWordKeys(answered);
    expect(marked("The Keeper's bell RINGS; he rang the ring.", met)).toEqual(["Keeper's", "RINGS", "ring"]);
    // Whole words only: a word that only starts like one is not it, nor another form of it.
    expect(marked("The keepers kept it; keep it.", met)).toEqual(["keepers", "kept"]);
    expect(marked("Bookkeeper, kepts.", met)).toEqual(["kepts"]);
  });

  it("keep short words and -ss, -is, -us words whole", () => {
    expect(metWordKey("bus")).toBe("bus");
    expect(metWordKey("glass")).toBe("glass");
    expect(metWordKey("this")).toBe("this");
    expect(metWordKey("status")).toBe("status");
    expect(metWordKey("Visitors")).toBe("visitor");
    expect(metWordKey("travelers’")).toBe("traveler");
    expect(metWordKey("café")).toBe("cafe");
  });

  it("match a phrase only where the question has the same phrase", () => {
    const met = metWordKeys(answered);
    expect(marked("Do people here keep time?", met)).toEqual([]);
    expect(marked("Do people here keep time?", met, [{ word: "keep time", meaning: "時間を守る" }])).toEqual(["keep time"]);
  });

  it("leave the text as it was, and mark nothing without words met", () => {
    const text = "They kept it at three.";
    const segments = markMetWords(englishTokens(text, []), metWordKeys(answered));
    expect(segments.map((segment) => segment.text).join("")).toBe(text);
    expect(segments.filter((segment) => segment.met).map((segment) => segment.text)).toEqual(["kept"]);
    expect(markMetWords(englishTokens(text, [])).some((segment) => segment.met)).toBe(false);
    expect(markMetWords(englishTokens(text, []), new Set()).some((segment) => segment.met)).toBe(false);
  });
});
