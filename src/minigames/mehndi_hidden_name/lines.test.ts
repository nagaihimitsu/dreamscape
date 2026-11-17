import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AGAIN_JA, DECOY_JA, FIRST_WRONG_JA, HINT_JA, LINGER_JA, NEAR_KNOWS_JA, NEAR_WONDERS_JA, SAID_MS, WRONG_JA, mehndiAnswer, mehndiSaidMs } from "./lines";
import { MEHNDI_SPOTS, MEHNDI_TUNING } from "./rules";

// Her answers in the hidden name's look (docs/13 2.2): which word she says at a wrong thing or place, and for how long.
// 2026-11-17 review: her words counted the places the rules count, so after her 「次も外れたら、教えちゃうね」 a player who
// pointed at three more decorations of places already counted got no hint; and her longest word was gone in 1.6 s.
const hintAfter = MEHNDI_TUNING.hintAfter;
/** Her answer to a new wrong thing (the `count`-th) or to one pointed at again, a decoration unless `spot` says a place. */
const fresh = (count: number, decoyWords = 0) => mehndiAnswer("index", true, { count, fresh: true }, hintAfter, decoyWords);
const again = (count: number, decoyWords = 0) => mehndiAnswer("index", true, { count, fresh: false }, hintAfter, decoyWords);

describe("her answer to a wrong thing or place", () => {
  it("teases at the first, warns at the second, and hints from the third, whatever the wrong things are", () => {
    expect(hintAfter).toBe(3);
    expect(fresh(1)).toEqual({ textJa: `ふふ、${DECOY_JA[0]}`, hint: false, decoyWord: true });
    expect(fresh(2)).toEqual({ textJa: AGAIN_JA, hint: false, decoyWord: false });
    for (const count of [3, 4, 5, 12]) expect(fresh(count), `${count}`).toEqual({ textJa: HINT_JA, hint: true, decoyWord: false });
    // A place itself (a key, a point beside every decoration): her word about the pattern there, in the same order.
    for (const spot of MEHNDI_SPOTS) {
      expect(mehndiAnswer(spot, false, { count: 1, fresh: true }, hintAfter, 2)).toEqual({ textJa: `ふふ、${WRONG_JA[spot]}`, hint: false, decoyWord: false });
      expect(mehndiAnswer(spot, false, { count: 2, fresh: true }, hintAfter, 0).textJa).toBe(AGAIN_JA);
      expect(mehndiAnswer(spot, false, { count: 3, fresh: true }, hintAfter, 0)).toEqual({ textJa: HINT_JA, hint: true, decoyWord: false });
    }
    expect(FIRST_WRONG_JA).toBe("ふふ、");
  });

  it("keeps her promise: once she has warned, the next wrong point brings her hint, a new thing or one pointed at again", () => {
    expect(AGAIN_JA).toContain("次も外れたら、教えちゃうね");
    // After the warning (two wrong things so far): a third thing, or either of the two again.
    expect(fresh(3).hint).toBe(true);
    expect(again(2)).toEqual({ textJa: HINT_JA, hint: true, decoyWord: false });
    // And from then on, every wrong point.
    for (const count of [3, 4, 9]) expect(again(count).hint, `${count}`).toBe(true);
  });

  it("says her word alone at the first wrong thing pointed at again: no 「ふふ、」 a second time, no warning, no hint", () => {
    expect(again(1)).toEqual({ textJa: DECOY_JA[0], hint: false, decoyWord: true });
    expect(mehndiAnswer("wrist", false, { count: 1, fresh: false }, hintAfter, 0)).toEqual({ textJa: WRONG_JA.wrist, hint: false, decoyWord: false });
  });

  it("says her words about decorations in turn, and counts one only when it was said", () => {
    expect(DECOY_JA).toHaveLength(3);
    expect([0, 1, 2, 3, 4].map((said) => again(1, said).textJa)).toEqual([DECOY_JA[0], DECOY_JA[1], DECOY_JA[2], DECOY_JA[0], DECOY_JA[1]]);
    expect(fresh(1, 1).textJa).toBe(`ふふ、${DECOY_JA[1]}`);
    // Her warning and her hint are no words about decorations: the turn does not move on.
    expect(fresh(2, 1).decoyWord).toBe(false);
    expect(fresh(3, 1).decoyWord).toBe(false);
  });

  it("follows the tuning's hintAfter (Debug's room): later hints keep the warning just before them", () => {
    const at = (count: number, isFresh = true) => mehndiAnswer("index", true, { count, fresh: isFresh }, 5, 0);
    expect(at(1).textJa).toBe(`ふふ、${DECOY_JA[0]}`);
    expect(at(2).textJa).toBe(DECOY_JA[0]);
    expect(at(3).textJa).toBe(DECOY_JA[0]);
    expect(at(3, false).hint).toBe(false);
    expect(at(4).textJa).toBe(AGAIN_JA);
    expect(at(4, false).hint).toBe(true);
    expect(at(5).hint).toBe(true);
    // A hint from the first wrong thing on.
    expect(mehndiAnswer("index", true, { count: 1, fresh: true }, 1, 0).hint).toBe(true);
  });

  it("never says 名前, and keeps every line of hers out of the field's .tsx", () => {
    const lines = [...Object.values(WRONG_JA), FIRST_WRONG_JA, AGAIN_JA, HINT_JA, ...DECOY_JA, ...NEAR_KNOWS_JA, ...NEAR_WONDERS_JA, ...LINGER_JA];
    // In two branches of the story what is hidden is not his name.
    for (const line of lines) expect(line).not.toMatch(/名前|なまえ/u);
    // Dialogue is kept out of the .tsx (AGENTS.md): none of her lines, nor her 「ふふ、」, is written in the field.
    const field = readFileSync(new URL("./Skin.tsx", import.meta.url), "utf8").replace(/^\s*(?:\/\/|\/?\*).*$/gmu, "");
    for (const line of lines) expect(field.includes(line), line).toBe(false);
  });
});

describe("how long her word shows", () => {
  it("shows a short word 1.6 s and a longer one long enough to read (90 ms a character)", () => {
    expect(SAID_MS).toBe(1600);
    // Her hint shows as long as its ring's animation (skin.css: 1600ms).
    expect(mehndiSaidMs(HINT_JA)).toBe(1600);
    const css = readFileSync(new URL("./skin.css", import.meta.url), "utf8");
    expect(css).toMatch(/animation: mg-mehndi-hidden-name-hint 1600ms /u);
    for (const spot of MEHNDI_SPOTS) expect(mehndiSaidMs(WRONG_JA[spot])).toBe(1600);
    // The longest word about decorations (30 characters) was gone in 1.6 s: now 2.7 s.
    expect([...DECOY_JA[2]]).toHaveLength(30);
    expect(mehndiSaidMs(DECOY_JA[2])).toBe(2700);
    expect(mehndiSaidMs(`${FIRST_WRONG_JA}${DECOY_JA[0]}`)).toBe(22 * 90);
    expect(mehndiSaidMs(AGAIN_JA)).toBe(21 * 90);
    // No word of hers is read faster than about 11 characters a second.
    for (const line of [...Object.values(WRONG_JA), AGAIN_JA, HINT_JA, ...DECOY_JA]) expect([...line].length / (mehndiSaidMs(line) / 1000), line).toBeLessThanOrEqual(11.2);
  });
});
