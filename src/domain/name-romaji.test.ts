import { describe, expect, it } from "vitest";
import { isLatinSpelling, latinName, playerLatinName, spellingAllowed } from "./name-romaji";

// The player's name in Latin letters for the Jaipur mehndi (2026-11-16, the user's decision: no Japanese letters in the
// pattern, the name in a cursive hand). Kana in Hepburn as on a passport; Latin kept; anything else null.

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

// The title's and the settings' 「ローマ字のつづり（任意）」 keep only Latin letters (the save refuses anything else).
describe("isLatinSpelling", () => {
  it.each(["Taichi", "taichi", "  Ken'ichi ", "Jean-Luc", "Émile", "ＴＡＲＯ", "Taro Yamada"])("keeps %j", (typed) => {
    expect(isLatinSpelling(typed)).toBe(true);
  });

  it.each(["", " ", "たいち", "タイチ", "ﾀｲﾁ", "太一", "Taichiたいち", "Taroー", "하루", "Taichi2", "..."])("refuses %j", (typed) => {
    expect(isLatinSpelling(typed)).toBe(false);
  });

  it("lets a form start or save with a blank spelling (none given) or one in Latin letters only", () => {
    expect(["", "  ", "Taichi", " taichi "].every(spellingAllowed)).toBe(true);
    expect(["たいち", "太一", "Taichi2"].some(spellingAllowed)).toBe(false);
  });
});

describe("playerLatinName", () => {
  it("prefers the player's own spelling, else the name in Latin letters, else null", () => {
    expect(playerLatinName("Taichy", "たいち")).toBe("Taichy");
    expect(playerLatinName(undefined, "たいち")).toBe("Taichi");
    expect(playerLatinName(undefined, "太一")).toBeNull();
    expect(playerLatinName("taichi", "太一")).toBe("Taichi");
    // A spelling with no Latin form falls back to the name.
    expect(playerLatinName("太一", "たいち")).toBe("Taichi");
  });
});
