import { describe, expect, it } from "vitest";
import { burstAngles, countedScore, countPhase, fillNames, FINISH, finishLevel, finishWord, hitStopMs, pickLine, resultButtons, resultCardDelay } from "./flow";
import { MINI_GAME_COUNT_MS, MINI_GAME_FINISH_MS, MINI_GAME_GO_MS } from "./timing";

describe("the host's count", () => {
  it("counts 3・2・1 through the lead (about 1.2 s with スタート), then shows スタート！ for a moment as the clock runs", () => {
    expect(MINI_GAME_COUNT_MS + MINI_GAME_GO_MS).toBeLessThanOrEqual(1500);
    expect(countPhase(MINI_GAME_COUNT_MS, 0)).toBe("3");
    expect(countPhase(601, 0)).toBe("3");
    expect(countPhase(600, 0)).toBe("2");
    expect(countPhase(300, 0)).toBe("1");
    expect(countPhase(1, 0)).toBe("1");
    expect(countPhase(0, 0)).toBe("go");
    expect(countPhase(0, MINI_GAME_GO_MS - 1)).toBe("go");
    expect(countPhase(0, MINI_GAME_GO_MS)).toBeNull();
  });
});

describe("the host's finish", () => {
  it("is strongest for ★3, then ★2, and plain for ★1 or a play that is not rated", () => {
    expect(finishLevel({ stars: 3 })).toBe("great");
    expect(finishLevel({ stars: 2 })).toBe("good");
    expect(finishLevel({ stars: 1 })).toBe("plain");
    expect(finishLevel(null)).toBe("plain");
    expect(FINISH.great.stopMs).toBeGreaterThan(FINISH.good.stopMs);
    expect(FINISH.good.stopMs).toBeGreaterThan(FINISH.plain.stopMs);
  });

  it("says 「そこまで！」 unless the outcome has its own word, and nothing when it says null", () => {
    expect(finishWord(undefined)).toBe("そこまで！");
    expect(finishWord("アウト！")).toBe("アウト！");
    expect(finishWord(null)).toBeNull();
  });

  it("brings the result card after the finish word, or after the field's longer hold (never both added)", () => {
    expect(resultCardDelay(undefined)).toBe(MINI_GAME_FINISH_MS);
    expect(resultCardDelay(200)).toBe(MINI_GAME_FINISH_MS);
    expect(resultCardDelay(750)).toBe(750);
  });

  it("keeps a hit-stop between 40 and 150 ms", () => {
    expect(hitStopMs(undefined)).toBe(90);
    expect(hitStopMs(10)).toBe(40);
    expect(hitStopMs(500)).toBe(150);
    expect(hitStopMs(Number.NaN)).toBe(90);
  });
});

describe("the result card", () => {
  it("offers 「もう一回」 and 「本番へ」 in practice, 「次へ」 in the story (and 「もう一回」 where allowed), going on by itself only with 「次へ」 alone", () => {
    expect(resultButtons({ practice: true, retry: false })).toEqual({ next: false, retry: true, toReal: true, autoAdvance: false });
    expect(resultButtons({ practice: false, retry: false })).toEqual({ next: true, retry: false, toReal: false, autoAdvance: true });
    expect(resultButtons({ practice: false, retry: true })).toEqual({ next: true, retry: true, toReal: false, autoAdvance: false });
  });

  it("counts the score's first number up in its own decimals", () => {
    expect(countedScore("13個食べた", 0)).toBe("0個食べた");
    expect(countedScore("13個食べた", 0.5)).toBe("7個食べた");
    expect(countedScore("13個食べた", 1)).toBe("13個食べた");
    expect(countedScore("丸さ 82%", 1)).toBe("丸さ 82%");
    expect(countedScore("0.04秒差", 0.5)).toBe("0.02秒差");
    expect(countedScore("16拍のうち16拍", 0.5)).toBe("8拍のうち16拍");
    expect(countedScore("ぴったり", 0.3)).toBe("ぴったり");
  });

  it("picks the heroine's line by the seed (the same every time) and fills in the names", () => {
    const lines = ["a", "b", "c"];
    expect(pickLine(lines, 42)).toBe(pickLine(lines, 42));
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => pickLine(lines, seed))).size).toBeGreaterThan(1);
    expect(pickLine(undefined, 1)).toBeUndefined();
    expect(fillNames("{player_name}、{heroine_name}の番", { player: "ケイ", heroine: "ミナ" })).toBe("ケイ、ミナの番");
  });
});

describe("a burst", () => {
  it("spreads its particles round evenly, each moved at most 15° by the seed", () => {
    const angles = burstAngles(6, 7);
    expect(angles).toHaveLength(6);
    expect(burstAngles(6, 7)).toEqual(angles);
    for (let index = 1; index < angles.length; index++) {
      const gap = angles[index] - angles[index - 1];
      expect(gap).toBeGreaterThanOrEqual(60 - 30);
      expect(gap).toBeLessThanOrEqual(60 + 30);
    }
  });
});
