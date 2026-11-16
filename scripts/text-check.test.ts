import { describe, expect, it } from "vitest";
import { allTerms, dataPieces, foundVariant, formatTextReport, inkPieces, narrationSpeech, parseTermLedger, textNotes, type Term } from "./text-check";

const place = [
  "INCLUDE modules.ink",
  "-> DONE",
  "",
  "=== alpha_talk ===",
  "# scene: talk",
  "# at: visit alpha_gate",
  "# title: 門の前の勝負",
  "門の前は人が多い。 // 勝った (a comment is not text)",
  "係員が「暗くなってから、ね」とだけ言った。",
  "ガイドは言った。「この門は、王が勝利を祝って建てたのです」",
  "# speaker: enemy",
  "名前の出ない相手の声。 # voice: alpha_talk_001",
  "# speaker: narrator",
  "# letter: note",
  "請願書には「この墓は、娘が両親のために建てた。タージより先に」とある。",
  "* [自由時間にしよう] -> alpha_helper",
  "",
  "=== alpha_helper ===",
  "呼ばれた先の行（話し手は呼んだ場面のもの）。「とても長い引用の言葉がここにあります」",
  "-> END",
  "",
  "=== alpha_battle ===",
  "# scene: battle",
  "# speaker: enemy",
  "負けないよ。 # voice: alpha_battle_001",
  "-> END",
].join("\n");
const ink = { storyId: "places/alpha_place", file: "content/journeys/alpha/stories/places/alpha_place.ink", journey: "alpha", source: place };

describe("inkPieces", () => {
  it("reads the lines with their static plate, the choices' words and the text tags, never the comments", () => {
    const pieces = inkPieces(ink);
    expect(pieces.map((piece) => [piece.line, piece.kind, piece.plate])).toEqual([
      [7, "tag", undefined], [8, "line", "narration"], [9, "line", "narration"], [10, "line", "narration"],
      [12, "line", "unnamed-enemy"], [15, "line", "narration"], [16, "choice", undefined],
      [19, "line", "unknown"], [25, "line", "named"],
    ]);
    expect(pieces[0].text).toBe("門の前の勝負");
    expect(pieces[1].text).toBe("門の前は人が多い。");
    expect(pieces[4].voiced).toBe(true);
    expect(pieces[5].written).toBe(true);
    expect(pieces[6].text).toBe("自由時間にしよう");
  });
});

describe("dataPieces", () => {
  it("reads the …Ja fields (and the strings of arrays under them) with their lines", () => {
    const text = JSON.stringify({ id: "alpha_q", questions: [{ id: "alpha_q1", questionJa: "誰が勝った？", textEn: "Who won?" }], nightLinesJa: ["一", "二"] }, null, 2);
    const pieces = dataPieces({ file: "content/journeys/alpha/quizzes/alpha_q.json", journey: "alpha", text });
    expect(pieces.map((piece) => [piece.text, piece.line, piece.where])).toEqual([
      ["誰が勝った？", 6, "questions[0].questionJa（alpha_q1）"], ["一", 11, "nightLinesJa[0]（alpha_q）"], ["二", 12, "nightLinesJa[1]（alpha_q）"],
    ]);
  });
});

describe("the notes", () => {
  it("finds a narration line that reads as speech: a long quotation, a reported speech, あなた", () => {
    expect(narrationSpeech("係員が「暗くなってから、ね」とだけ言った。")).toBeUndefined();
    expect(narrationSpeech("誰かが毎回「もうちょっと下がって」と叫んでいた。")).toContain("10字");
    expect(narrationSpeech("今朝、決まったのだと。")).toContain("〜と。");
    expect(narrationSpeech("彼女はそっと。")).toBeUndefined();
    expect(narrationSpeech("あなたの番だ。")).toContain("あなた");
  });

  it("finds a term's variant outside its preferred and allowed words, once per term", () => {
    const term: Term = { preferred: "チーニー・カ・ラウザー", avoid: ["チーニー・カ・ラウザ"] };
    expect(foundVariant("チーニー・カ・ラウザーへ", term)).toBeUndefined();
    expect(foundVariant("チーニー・カ・ラウザーとチーニー・カ・ラウザ", term)).toBe("チーニー・カ・ラウザ");
    expect(foundVariant("素敵な敵", { preferred: "相手", avoid: ["敵"], allow: ["素敵"] })).toBe("敵");
    expect(foundVariant("素敵", { preferred: "相手", avoid: ["敵"], allow: ["素敵"] })).toBeUndefined();
    expect(allTerms([[term], [term, { preferred: "街歩き", avoid: ["自由時間"] }]])).toHaveLength(2);
  });

  it("gives (a) to (c) for the pieces, not words of winning and losing (2026-11-16), and prints the counts per kind and journey, then each note", () => {
    const terms: Term[] = [{ preferred: "街歩き", avoid: ["自由時間"], reasonJa: "2026-11-16 のユーザー判断" }];
    const notes = textNotes(inkPieces(ink), (journey) => (journey === "alpha" ? terms : []));
    // The quotation of line 9 is short; the letter of line 15 is read, not spoken; line 19's speaker is its caller's.
    // 勝負 (line 7), 勝利 (line 10) and 負け (line 25) give no note.
    expect(notes.map((note) => [note.kind, note.piece.line])).toEqual([
      ["narration-speech", 10], ["narration-speech", 12], ["voice-no-plate", 12], ["term", 16],
    ]);
    const lines = formatTextReport(notes, { journeys: ["alpha", "core"], ledgers: [{ journey: "alpha", file: "authoring/journeys/alpha/terms.json", count: 1 }] });
    expect(lines).toContain("- (a) 「旅の風景」の名札のまま人が話しているかもしれない行：2件（alpha 2、共通 0）");
    expect(lines.some((line) => line.includes("勝ち負け"))).toBe(false);
    expect(lines).toContain("  content/journeys/alpha/stories/places/alpha_place.ink:16（knot alpha_talk）「自由時間」→「街歩き」（2026-11-16 のユーザー判断）");
  });
});

describe("parseTermLedger", () => {
  it("reads a ledger and refuses one of the wrong shape, naming the file", () => {
    const text = JSON.stringify({ schemaVersion: 1, terms: [{ preferred: "街歩き", avoid: ["自由時間"], reasonJa: "理由" }] });
    expect(parseTermLedger("authoring/journeys/alpha/terms.json", text)).toEqual([{ preferred: "街歩き", avoid: ["自由時間"], reasonJa: "理由" }]);
    expect(() => parseTermLedger("authoring/journeys/alpha/terms.json", JSON.stringify({ schemaVersion: 1, terms: [{ preferred: "街歩き" }] })))
      .toThrow("用語の台帳 authoring/journeys/alpha/terms.json の形が違います");
    expect(() => parseTermLedger("x.json", "{")).toThrow("x.json を JSON として読めません");
  });
});
