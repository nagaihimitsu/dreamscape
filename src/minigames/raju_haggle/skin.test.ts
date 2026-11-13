import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { StepPickView } from "../engines/step_pick/EnginePlay";
import { rajuHaggle } from "./definition";
import type { RajuHaggleOutcome } from "./rules";
import { rajuHaggleSkin } from "./Skin";

// The haggle's field (docs/13 2.12, 4.2): the price on show, a price the player cannot pay drawn lowered to its fallback's,
// and the use's pictures in place of Raju's standing picture.

const ALL: RajuHaggleOutcome[] = ["buy_map", "fair_map", "haggle_map", "decline_map"];
const field = ({ available = ALL, art = {}, view = { step: 0, ending: null, outcome: null } }: {
  available?: RajuHaggleOutcome[]; art?: Record<string, string>; view?: StepPickView<RajuHaggleOutcome>;
} = {}) => renderToStaticMarkup(createElement(rajuHaggleSkin.Field, {
  params: {}, available, still: false, seed: 1, names: { player: "主人公", heroine: "ヒロイン" },
  cast: { heroine: null, person: createElement("i", { "data-testid": "raju-standing" }) },
  art, sound: () => undefined, vibrate: () => undefined, view, frames: () => () => undefined,
}));

describe("the haggle's field", () => {
  it("shows his asking price on show with his words, the lower ones coming, and his standing picture", () => {
    const html = field();
    expect(html).toContain('class="mg-raju-haggle"');
    expect(html).toContain("五十ルピー！");
    expect(html).toMatch(/data-state="now"[^>]*>.*?₹50/u);
    expect(html).toContain("₹40");
    expect(html).toContain("₹30");
    expect(html).toContain("raju-standing");
    expect(html).not.toContain("mg-raju-haggle-was");
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

  it("stamps the deal at the price taken (its fallback's when that one cannot be paid), or no deal", () => {
    expect(field({ view: { step: 1, ending: { kind: "take", step: 1 }, outcome: "fair_map" } })).toContain("決まり");
    const fellBack = field({ available: ["haggle_map", "decline_map"], view: { step: 0, ending: { kind: "take", step: 0 }, outcome: "buy_map" } });
    expect(fellBack).toContain('data-decided="haggle_map"');
    expect(field({ view: { step: 3, ending: { kind: "none" }, outcome: "decline_map" } })).toContain("買わない");
  });

  it("puts the use's picture of his mood in place of his standing picture", () => {
    expect(rajuHaggle.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["raju_glad", "sprite"], ["raju_unsure", "sprite"], ["raju_sulky", "sprite"]]);
    const art = { raju_glad: "/assets/minigames/glad.webp", raju_unsure: "/assets/minigames/unsure.webp", raju_sulky: "/assets/minigames/sulky.webp" };
    const html = field({ art });
    expect(html).toContain('src="/assets/minigames/glad.webp"');
    expect(html).not.toContain("raju-standing");
    expect(field({ art, view: { step: 2, ending: null, outcome: null } })).toContain('src="/assets/minigames/sulky.webp"');
  });
});
