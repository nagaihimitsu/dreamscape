import { describe, expect, it } from "vitest";
import { englishTokens } from "./InteractiveEnglish";
import { normalizeWord } from "../../content/word-meanings";
import { battleQuizzes } from "../../content";

describe("interactive English words", () => {
  it("preserves punctuation and gives authored phrases priority over generic meanings", () => {
    const input = "Compared with true fresco, the paint was less secure.";
    const tokens = englishTokens(input, [
      { word: "true fresco", meaning: "本来のフレスコ技法" },
      { word: "secure", meaning: "しっかり定着した" },
    ]);
    expect(tokens.map((t) => t.text).join("")).toBe(input);
    expect(tokens.find((t) => t.text === "true fresco")).toMatchObject({
      meaning: "本来のフレスコ技法",
      contextual: true,
    });
    expect(tokens.find((t) => t.text === "secure")).toMatchObject({
      meaning: "しっかり定着した",
      contextual: true,
    });
    expect(tokens.find((t) => t.text === "paint")).toMatchObject({
      contextual: false,
    });
  });
  it("has a selectable meaning for every published word", () => {
    for (const quiz of Object.values(battleQuizzes))
      for (const question of quiz.questions)
        for (const text of [
          question.questionEn,
          ...question.options.map((option) => option.textEn),
        ]) {
          const tokens = englishTokens(text, question.vocabularyJa);
          expect(tokens.map((item) => item.text).join("")).toBe(text);
          for (const token of tokens)
            if (/[\p{L}]/u.test(token.text))
              expect(
                token.meaning,
                `${question.id}: ${token.text}`,
              ).toBeTruthy();
        }
  });
  it("recognises accented words and curly apostrophes", () => {
    expect(normalizeWord("café")).toBe("cafe");
    expect(normalizeWord("spire’s")).toBe("spire's");
    expect(
      englishTokens("A café and the spire’s roof.", []).filter((t) => t.meaning)
        .length,
    ).toBe(6);
  });
});
