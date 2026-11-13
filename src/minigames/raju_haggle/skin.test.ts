import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { StepPickView } from "../engines/step_pick/EnginePlay";
import { rajuHaggle } from "./definition";
import { RAJU_TUNING, type RajuHaggleOutcome } from "./rules";
import { rajuHaggleSkin } from "./Skin";

// The haggle's field (docs/13 2.12, 4.2): the price on show, his patience as dots, a price the player cannot pay drawn
// lowered to its fallback's, the stamp on one line in the paper's middle, and the use's pictures in place of Raju's
// standing picture.

const ALL: RajuHaggleOutcome[] = ["buy_map", "fair_map", "haggle_map", "decline_map"];
const start: StepPickView<RajuHaggleOutcome> = { step: 0, pushes: 0, pushedAt: null, activeAt: 0, denied: 0, ending: null, outcome: null };
const field = ({ available = ALL, art = {}, view = {} }: {
  available?: RajuHaggleOutcome[]; art?: Record<string, string>; view?: Partial<StepPickView<RajuHaggleOutcome>>;
} = {}) => renderToStaticMarkup(createElement(rajuHaggleSkin.Field, {
  params: {}, available, still: false, seed: 1, names: { player: "主人公", heroine: "ヒロイン" }, tuning: RAJU_TUNING,
  cast: { heroine: null, person: createElement("i", { "data-testid": "raju-standing" }) },
  art, sound: () => undefined, vibrate: () => undefined, view: { ...start, ...view }, frames: () => () => undefined,
})).replace(/<wbr\/>/gu, "");
const dots = (html: string) => [...html.matchAll(/<i( data-spent="true")?><\/i>/gu)].map((match) => (match[1] ? "○" : "●")).join("");

describe("the haggle's field", () => {
  it("shows his asking price on show with his words, his full patience, the lower ones coming, and his standing picture", () => {
    const html = field();
    expect(html).toContain('class="mg-raju-haggle"');
    expect(html).toContain("五十ルピー！");
    expect(html).toMatch(/data-state="now"[^>]*>.*?₹50/u);
    expect(html).toContain("₹40");
    expect(html).toContain("₹30");
    expect(html).toContain("raju-standing");
    expect(html).not.toContain("mg-raju-haggle-was");
    expect(dots(html)).toBe("●●●●●");
  });

  it("spends a dot of his patience at each stare, and lowers the price every second one", () => {
    const one = field({ view: { pushes: 1, pushedAt: 1000 } });
    expect(one).toContain("そんなに見ないで");
    expect(dots(one)).toBe("●●●●○");
    const four = field({ view: { step: 2, pushes: 4, pushedAt: 4000 } });
    expect(four).toMatch(/data-state="now"[^>]*>.*?₹30/u);
    expect(four).toContain("さ、三十");
    expect(dots(four)).toBe("●○○○○");
    const out = field({ view: { step: 2, pushes: 5, ending: { kind: "out" }, outcome: "decline_map" } });
    expect(out).toContain("もういい！");
    expect(out).toContain("data-away=\"true\"");
    expect(dots(out)).toBe("○○○○○");
  });

  it("draws a price the player cannot pay lowered to the one it falls back to, and none payable as such", () => {
    const lowered = field({ available: ["fair_map", "haggle_map", "decline_map"] });
    expect(lowered).toContain("<s class=\"mg-raju-haggle-was\">₹50</s>");
    expect(lowered).toContain("じゃあ、四十");
    const none = field({ available: ["decline_map"] });
    expect(none).toContain("買えない");
    expect(none).toContain("見るだけね");
    expect(rajuHaggleSkin.takeOpen?.(0, ["decline_map"])).toBe(false);
    expect(rajuHaggleSkin.takeOpen?.(2, ["haggle_map", "decline_map"])).toBe(true);
  });

  it("puts the price on the take button and in the top band, with his patience in words", () => {
    expect(rajuHaggleSkin.takeDetailJa?.(1, ALL)).toBe("₹40");
    expect(rajuHaggleSkin.takeDetailJa?.(0, ["haggle_map", "decline_map"])).toBe("₹30");
    expect(rajuHaggleSkin.takeDetailJa?.(0, ["decline_map"])).toBe("");
    expect(rajuHaggleSkin.statusJa?.({ ...start, step: 1, pushes: 2 }, ALL)).toBe("いまの値段 ₹40　がまん 3/5");
    expect(rajuHaggleSkin.statusJa?.(start, ["decline_map"])).toBe("買える値段がない　がまん 5/5");
  });

  it("stamps the deal (its fallback's when that price cannot be paid) or no deal across the paper's middle, and says what was saved", () => {
    expect(field({ view: { step: 1, pushes: 2, ending: { kind: "take", step: 1 }, outcome: "fair_map" } })).toContain(">決まり<");
    const fellBack = field({ available: ["haggle_map", "decline_map"], view: { ending: { kind: "take", step: 0 }, outcome: "buy_map" } });
    expect(fellBack).toContain('data-decided="haggle_map"');
    expect(field({ view: { ending: { kind: "leave" }, outcome: "decline_map" } })).toContain(">買わない<");
    expect(rajuHaggleSkin.detailJa?.("haggle_map", ALL)).toBe("₹20 値切った");
    expect(rajuHaggleSkin.detailJa?.("buy_map", ["haggle_map", "decline_map"])).toBe("₹20 値切った");
    expect(rajuHaggleSkin.detailJa?.("buy_map", ALL)).toBeUndefined();
    expect(rajuHaggleSkin.detailJa?.("decline_map", ALL)).toBeUndefined();
  });

  it("puts the use's picture of his mood in place of his standing picture", () => {
    expect(rajuHaggle.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["raju_glad", "sprite"], ["raju_unsure", "sprite"], ["raju_sulky", "sprite"]]);
    const art = { raju_glad: "/assets/minigames/glad.webp", raju_unsure: "/assets/minigames/unsure.webp", raju_sulky: "/assets/minigames/sulky.webp" };
    const html = field({ art });
    expect(html).toContain('src="/assets/minigames/glad.webp"');
    expect(html).not.toContain("raju-standing");
    expect(field({ art, view: { step: 2, pushes: 4 } })).toContain('src="/assets/minigames/sulky.webp"');
  });
});
