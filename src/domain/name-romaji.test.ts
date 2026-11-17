import { describe, expect, it } from "vitest";
import { kanaReading, latinName, nameFieldEdit, playerLatinName, readingFits, readingToSave, startReading } from "./name-romaji";

// The player's name in Latin letters for the Jaipur mehndi (2026-11-16, the user's decision: no Japanese letters in the
// pattern). Kana in Hepburn without long-vowel marks (ん always n); Latin kept; anything else null. A kanji name has one
// through the reading captured while it was typed (2026-11-17, the user's decision: no field for it), when that fits.

const cases: [input: string, latin: string | null][] = [
  ["たいち", "Taichi"], ["ゆうき", "Yuki"], ["しょうた", "Shota"], ["りょう", "Ryo"], ["しょうへい", "Shohei"],
  ["こうへい", "Kohei"], ["おおの", "Ono"], ["とおる", "Toru"], ["ゆうう", "Yu"], ["けい", "Kei"], ["にいな", "Niina"], ["さあや", "Saaya"],
  ["けんいち", "Kenichi"], ["しんや", "Shinya"], ["じゅんぺい", "Junpei"], ["かんな", "Kanna"], ["じゅん", "Jun"], ["ちひろ", "Chihiro"],
  ["きっぺい", "Kippei"], ["いっちゃん", "Itchan"], ["えっちゃん", "Etchan"], ["てっしん", "Tesshin"], ["みっつ", "Mittsu"],
  ["ヴィクトル", "Vikutoru"], ["ジョン", "Jon"], ["アンナ", "Anna"], ["ケイ", "Kei"], ["みー", "Mi"], ["ミー", "Mi"], ["ユーリ", "Yuri"],
  ["ジョージ", "Joji"], ["フェリックス", "Ferikkusu"], ["ティナ", "Tina"], ["ふうか", "Fuka"], ["ぢゅん", "Jun"], ["を", "O"],
  ["ゆウき", "Yuki"], ["たろウ", "Taro"], ["ﾀﾛｳ", "Taro"], ["ﾊﾟｳﾛ", "Pauro"],
  ["たいち ゆうき", "Taichi Yuki"], ["たいち  ゆうき", "Taichi Yuki"], ["たいち　ゆうき", "Taichi Yuki"], ["ミラノ・タロウ", "Mirano Taro"], ["ジャン＝ポール", "Jan-Poru"], ["ジャン=ポール", "Jan-Poru"], ["ジャン゠ポール", "Jan-Poru"], ["ヽ", null], ["さゝき", "Sasaki"], ["ミヽ", "Mimi"], ["たいち ", "Taichi"],
  ["みすゞ", "Misuzu"], ["ヴァイオレット", "Vaioretto"], ["こうめ", "Kome"],
  ["Taro", "Taro"], ["taro", "Taro"], ["TARO", "Taro"], ["ＴＡＲＯ", "Taro"], ["Émile", "Émile"], ["émile", "Émile"], ["Émile", "Émile"],
  ["McKenzie", "McKenzie"], ["jean-luc", "Jean-Luc"], ["AJ", "AJ"], ["  taro  yamada ", "Taro Yamada"], ["O'Brien", "O'Brien"], ["o'brien", "O'Brien"],
  ["太一", null], ["太いち", null], ["たいちTaro", null], ["하루", null], ["🌸", null], ["たいち2", null], ["", null], ["　", null], ["・", null], ["ー", null], ["っ", null], ["...", null], ["Тарō", null],
];

describe("latinName", () => {
  it.each(cases)("%j → %j", (input, latin) => {
    expect(latinName(input)).toBe(latin);
  });

  it("never returns a Japanese letter", () => {
    for (const [input] of cases) expect(latinName(input) ?? "").not.toMatch(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u);
  });
});

describe("kanaReading", () => {
  it.each([["たいち", "たいち"], ["タイチ", "たいち"], ["ﾀｲﾁ", "たいち"], [" やまだ　 たいち ", "やまだ たいち"], ["じょー", "じょー"]])(
    "keeps %j as %j", (text, reading) => {
      expect(kanaReading(text)).toBe(reading);
    });

  it.each(["", " ", "ー", "太一", "たいちTaro", "たいち2", "Taichi", "たい・ち"])("refuses %j", (text) => {
    expect(kanaReading(text)).toBeNull();
  });
});

describe("readingFits", () => {
  it.each([
    ["たいち", "太一"], ["たいち", "太いち"], ["タイチ", "太一"], ["たいち", "太 一"], ["やまだ たいち", "山田 太一"], ["やまだたいち", "山田　太一"],
    ["ささき", "佐々木"], ["いちがや", "一ヶ谷"], ["こころざし", "志"], ["じょーた", "ジョー太"],
  ])("%j fits %j", (reading, name) => {
    expect(readingFits(reading, name)).toBe(true);
  });

  it.each([
    // The kana of the name read otherwise, or at another place.
    ["たろう", "太いち"], ["いちた", "太いち"],
    // Too few kana for the kanji (each takes at least one), or too many (each at most five).
    ["た", "太一"], ["うけたまわる", "承"], ["たいちたいちたいちたい", "太一"],
    // Not kana, or a name with letters that are neither kana nor kanji.
    ["Taichi", "太一"], ["", "太一"], ["たいちじゅにあ", "太一Jr"], ["たいちに", "太一2"], ["たいち", ""],
  ])("%j does not fit %j", (reading, name) => {
    expect(readingFits(reading, name)).toBe(false);
  });
});

describe("playerLatinName", () => {
  it("is the name's own Latin form, ignoring the reading, else the reading's when it fits, else null", () => {
    expect(playerLatinName(undefined, "たいち")).toBe("Taichi");
    expect(playerLatinName("じろう", "たいち")).toBe("Taichi");
    expect(playerLatinName("たろう", "Taichi")).toBe("Taichi");
    expect(playerLatinName("たいち", "太一")).toBe("Taichi");
    expect(playerLatinName("タイチ", "太一")).toBe("Taichi");
    expect(playerLatinName("たいち", "太いち")).toBe("Taichi");
    expect(playerLatinName("やまだ たいち", "山田 太一")).toBe("Yamada Taichi");
    expect(playerLatinName(undefined, "太一")).toBeNull();
    expect(playerLatinName("たろう", "太いち")).toBeNull();
    expect(playerLatinName("た", "太一")).toBeNull();
    // The known limit: 太一 picked from a phone's prediction after typing たい.
    expect(playerLatinName("たい", "太一")).toBe("Tai");
  });
});

describe("readingToSave", () => {
  const fresh = { name: "" };
  it("keeps what was typed into an empty field when it fits, and nothing for a name that needs none", () => {
    expect(readingToSave("太一", "たいち", fresh)).toBe("たいち");
    expect(readingToSave(" 太一 ", "タイチ", fresh)).toBe("たいち");
    expect(readingToSave("太一", "た", fresh)).toBeUndefined();
    expect(readingToSave("太一", "", fresh)).toBeUndefined();
    expect(readingToSave("たいち", "たいち", fresh)).toBeUndefined();
    expect(readingToSave("Taichi", "", fresh)).toBeUndefined();
    expect(readingToSave("", "", fresh)).toBeUndefined();
  });

  it("continues from the saved reading of a name kept as it was, or added to", () => {
    const saved = { name: "太一", reading: "たいち" };
    expect(startReading(saved)).toBe("たいち");
    expect(readingToSave("太一", "たいち", saved)).toBe("たいち");
    expect(readingToSave("太一郎", "たいちろう", saved)).toBe("たいちろう");
    // A kana name reads as itself, so a kanji added to it is read on from there.
    const kana = { name: "たいち" };
    expect(startReading(kana)).toBe("たいち");
    expect(readingToSave("たいち郎", "たいちろう", kana)).toBe("たいちろう");
  });

  it("keeps no reading for a name whose start had none, or that was changed inside", () => {
    const unknown = { name: "太一" };
    expect(startReading(unknown)).toBe("");
    expect(readingToSave("太一", "", unknown)).toBeUndefined();
    expect(readingToSave("太一郎", "ろう", unknown)).toBeUndefined();
    // 一 deleted and 郎 typed: the reading of 太 alone is not known.
    expect(readingToSave("太郎", "たいちろう", { name: "太一", reading: "たいち" })).toBeUndefined();
  });

  it("takes only what was typed over a replaced name", () => {
    expect(readingToSave("花子", "たいちはなこ", { name: "太一", reading: "たいち" })).toBe("はなこ");
    expect(readingToSave("花子", "はなこ", { name: "太一" })).toBe("はなこ");
  });
});

describe("nameFieldEdit", () => {
  // The selection as the edit began: a caret at `at`, or a range.
  const caret = (at: number) => ({ start: at, end: at });
  const range = (start: number, end: number) => ({ start, end });

  it("starts the reading again when the field is emptied or its whole name typed over", () => {
    expect(nameFieldEdit("太一", "", caret(2))).toBe("restart");
    expect(nameFieldEdit("太", "")).toBe("restart");
    // Selected all and typed over: an IME's first kana (it shares no character with the old name), or the same first kana
    // as a kana name's (the default たいち typed over as 太一: たいち).
    expect(nameFieldEdit("太一", "じ", range(0, 2))).toBe("restart");
    expect(nameFieldEdit("たいち", "た", range(0, 3))).toBe("restart");
    expect(nameFieldEdit("太一", "次郎", range(0, 2))).toBe("restart");
    // An edit whose selection the field did not report (a browser's autofill): a new name with another first character.
    expect(nameFieldEdit("たいち", "太一")).toBe("restart");
    expect(nameFieldEdit("太一", "太一郎")).toBe("kept");
  });

  it("keeps the reading for a name typed on at its end, and for the kana typed and not yet converted changed one at a time", () => {
    expect(nameFieldEdit("", "た", caret(0))).toBe("kept");
    expect(nameFieldEdit("太一", "太一ろ", caret(2))).toBe("kept");
    expect(nameFieldEdit("太一", "太一r", caret(2))).toBe("kept");
    expect(nameFieldEdit("太一ろ", "太一", caret(3))).toBe("kept");
    expect(nameFieldEdit("太一ろ", "太一ら", range(2, 3))).toBe("kept");
    expect(nameFieldEdit("たいち", "またいち", caret(0))).toBe("kept");
    expect(nameFieldEdit("太一 ", "太一", caret(3))).toBe("kept");
    // A character beyond the BMP is two UTF-16 units: the selection is in units, the edit found in characters.
    expect(nameFieldEdit("𠮷", "𠮷た", caret(2))).toBe("kept");
  });

  it("loses the reading when a converted character is taken out, or the name changed before one", () => {
    // 太一 typed as たいち, then Backspace (and 一 typed again: the field is not emptied, so the reading stays lost).
    expect(nameFieldEdit("太一", "太", caret(2))).toBe("lost");
    expect(nameFieldEdit("太一", "一", caret(0))).toBe("lost");
    expect(nameFieldEdit("太一郎", "太郎", caret(2))).toBe("lost");
    expect(nameFieldEdit("太一", "太い", range(1, 2))).toBe("lost");
    expect(nameFieldEdit("太ジョン", "太ジョ", caret(4))).toBe("lost");
    expect(nameFieldEdit("𠮷田", "𠮷", caret(3))).toBe("lost");
    // Typed before a converted character (its kana would come after the kanji's in the reading): 一 between 太 and 郎,
    // or between 太 and 一 (太一一 shares 太一 with 太一, but the caret was after 太).
    expect(nameFieldEdit("太郎", "太い郎", caret(1))).toBe("lost");
    expect(nameFieldEdit("太一", "太一一", caret(1))).toBe("lost");
    expect(nameFieldEdit("たいち郎", "たい郎", caret(3))).toBe("lost");
    // A collapsed caret at the start is no selection of the whole: typed before the name.
    expect(nameFieldEdit("太一", "た太一", caret(0))).toBe("lost");
  });

  it("loses the reading when kana are taken out two at once, or one typed over with romaji (the capture takes either for a conversion)", () => {
    expect(nameFieldEdit("太一ろう", "太一", range(2, 4))).toBe("lost");
    expect(nameFieldEdit("たいち", "た", caret(3))).toBe("lost");
    expect(nameFieldEdit("たいち", "たいc", range(2, 3))).toBe("lost");
    // Typed over with kana: the capture follows it.
    expect(nameFieldEdit("たいち", "たいぢ", range(2, 3))).toBe("kept");
  });
});
