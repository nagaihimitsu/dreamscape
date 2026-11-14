import { describe, expect, it } from "vitest";
import soundData from "../../../content/presentation/sounds.json";
import {
  burstAngles, countedScore, countPhase, fillNames, FINISH, finishLevel, finishWord, hitStopMs, HOST_SOUNDS, pickLine, RESULT_CARD_MAX_COVER, RESULT_CARD_SHORT_PX,
  playLeavable, resultButtons, resultCardCompact, resultCardDelay, START_BUTTON_MARGIN_PX, startGuardDrops, vibrationDoubles,
} from "./flow";
import { MINI_GAME_COUNT_MS, MINI_GAME_FINISH_MS, MINI_GAME_GO_MS, MINI_GAME_START_GUARD_MS, MINI_GAME_VIBRATE_GAP_MS } from "./timing";

describe("the host's start guard", () => {
  const startBox = { left: 100, top: 700, right: 300, bottom: 748 };
  it("drops every press just after a start without the count, but in a drag game only one on the start button (group2 N10)", () => {
    expect(startGuardDrops({ sinceMs: 100, drag: false, point: { x: 10, y: 10 }, startBox })).toBe(true);
    expect(startGuardDrops({ sinceMs: MINI_GAME_START_GUARD_MS, drag: false, point: { x: 200, y: 720 }, startBox })).toBe(false);
    // A drag game: the first stroke on the dough goes through; the start button's second tap does not.
    expect(startGuardDrops({ sinceMs: 150, drag: true, point: { x: 200, y: 300 }, startBox })).toBe(false);
    expect(startGuardDrops({ sinceMs: 150, drag: true, point: { x: 200, y: 720 }, startBox })).toBe(true);
    expect(startGuardDrops({ sinceMs: 150, drag: true, point: { x: 100 - START_BUTTON_MARGIN_PX, y: 700 - START_BUTTON_MARGIN_PX }, startBox })).toBe(true);
    expect(startGuardDrops({ sinceMs: 150, drag: true, point: { x: 100 - START_BUTTON_MARGIN_PX - 1, y: 720 }, startBox })).toBe(false);
    // A key's press has no place: by the time alone; nor without the button's place.
    expect(startGuardDrops({ sinceMs: 150, drag: true, point: null, startBox })).toBe(true);
    expect(startGuardDrops({ sinceMs: 150, drag: true, point: { x: 200, y: 300 }, startBox: null })).toBe(true);
    expect(startGuardDrops({ sinceMs: MINI_GAME_START_GUARD_MS, drag: true, point: { x: 200, y: 720 }, startBox })).toBe(false);
  });
});

describe("leaving a play", () => {
  it("leaves practice any time, the real play only until its outcome is decided (its one try spent) or it has ended", () => {
    expect(playLeavable({ practice: false, ended: false, decided: false })).toBe(true);
    expect(playLeavable({ practice: false, ended: false, decided: true })).toBe(false);
    expect(playLeavable({ practice: false, ended: true, decided: true })).toBe(false);
    expect(playLeavable({ practice: true, ended: false, decided: true })).toBe(true);
    expect(playLeavable({ practice: true, ended: true, decided: true })).toBe(true);
  });
});

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

  it("takes the outcome's own tone where its word and its ★ disagree (group3 全体1, group2 N8)", () => {
    // 「踊りきった！」 on ★1 is a good end; 「フライング！」 on ★2 the end whistle; a hole a thud.
    expect(finishLevel({ stars: 1 }, "good")).toBe("good");
    expect(finishLevel({ stars: 2 }, "plain")).toBe("plain");
    expect(finishLevel(null, "oops")).toBe("oops");
    expect(FINISH.good.sound).toBe(FINISH.great.sound);
    expect(new Set([FINISH.good.sound, FINISH.plain.sound, FINISH.oops.sound]).size).toBe(3);
    expect([FINISH.great.vibration, FINISH.good.vibration]).toEqual(["success", "success"]);
    expect([FINISH.plain.vibration, FINISH.oops.vibration]).toEqual(["fail", "fail"]);
  });

  it("rings only registered sounds, which load as the instruction card shows (group2 N16)", () => {
    const registered = new Set(soundData.sounds.map((sound) => sound.id));
    for (const id of HOST_SOUNDS) expect(registered, id).toContain(id);
    for (const finish of Object.values(FINISH)) expect(HOST_SOUNDS).toContain(finish.sound);
  });

  it("does not vibrate twice for one moment: the finish not just after the play's own, nor the play just after the finish's (group2 N11)", () => {
    expect(vibrationDoubles(Number.NEGATIVE_INFINITY, 0)).toBe(false);
    expect(vibrationDoubles(1000, 1001)).toBe(true);
    expect(vibrationDoubles(1000, 1000 + MINI_GAME_VIBRATE_GAP_MS - 1)).toBe(true);
    expect(vibrationDoubles(1000, 1000 + MINI_GAME_VIBRATE_GAP_MS)).toBe(false);
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

describe("the compact result card", () => {
  it("is compact on a short play (320 × 568 to 375 × 667), whatever it covers", () => {
    expect(resultCardCompact({ card: { top: 500, bottom: 560 }, layerHeight: 568 })).toBe(true);
    expect(resultCardCompact({ card: { top: 500, bottom: 560 }, layerHeight: RESULT_CARD_SHORT_PX })).toBe(true);
    expect(resultCardCompact({ card: { top: 500, bottom: 560 }, layerHeight: RESULT_CARD_SHORT_PX + 1 })).toBe(false);
  });

  it("is compact on a taller play only when the full card would cover more than 45% of the field", () => {
    const field = { top: 100, bottom: 600 };
    // 37% of the field (390 × 844's cards): full.
    expect(resultCardCompact({ card: { top: 415, bottom: 680 }, field, layerHeight: 844 })).toBe(false);
    // 46%: compact.
    expect(resultCardCompact({ card: { top: 370, bottom: 680 }, field, layerHeight: 844 })).toBe(true);
    expect(resultCardCompact({ card: { top: 600 - 500 * RESULT_CARD_MAX_COVER, bottom: 700 }, field, layerHeight: 844 })).toBe(false);
    // A card below the field covers none of it; without a field, only the height decides.
    expect(resultCardCompact({ card: { top: 610, bottom: 900 }, field, layerHeight: 844 })).toBe(false);
    expect(resultCardCompact({ card: { top: 0, bottom: 800 }, layerHeight: 844 })).toBe(false);
    expect(resultCardCompact({ card: { top: 0, bottom: 800 }, field: { top: 10, bottom: 10 }, layerHeight: 844 })).toBe(false);
  });
});

describe("the result card's guard", () => {
  it("drops every press in the card's first moment, takes one after it", async () => {
    const { resultCardReady } = await import("./ResultCard");
    expect(resultCardReady(1000, 1000)).toBe(false);
    expect(resultCardReady(1000, 1449)).toBe(false);
    expect(resultCardReady(1000, 1450)).toBe(true);
  });
});
