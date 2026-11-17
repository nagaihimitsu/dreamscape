import { describe, expect, it } from "vitest";
import { kanaReading, latinName, playerLatinName, readingFits, readingToSave, startReading } from "./name-romaji";

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
