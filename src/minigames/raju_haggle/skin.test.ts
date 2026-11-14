import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { moodView, type StepPickView } from "../engines/step_pick/EnginePlay";
import { rajuHaggle } from "./definition";
import { RAJU_HAGGLE_TUNING, RAJU_TUNING, type RajuHaggleOutcome } from "./rules";
import { RAJU_TELLS, rajuCallJa, rajuHaggleSkin, rajuTell } from "./Skin";

// The haggle's field (docs/13 2.12, 4.2; round 3): his look drawn and said (his face, his words, his pose), his hurt pride
// in his face (no dots), a price the player cannot pay drawn lowered to its fallback's, the stamp, and the use's pictures
// in place of Raju's standing picture.

const ALL: RajuHaggleOutcome[] = ["buy_map", "fair_map", "haggle_map", "decline_map"];
/** The view at `ms` with no stare yet (his first routine). */
const at = (ms: number, step = 0, landed = 0, since = 0): StepPickView<RajuHaggleOutcome> => ({
  step, pushes: 0, landed, bounces: 0, lastPush: null, mood: moodView(RAJU_TUNING, step, landed, since, ms), pushedAt: null, activeAt: 0, denied: 0, ending: null, outcome: null,
});
const BOAST = 100;
const WOBBLE = RAJU_HAGGLE_TUNING.boastFirstMs + 100;
const field = ({ available = ALL, art = {}, view = {}, ms = BOAST }: {
  available?: RajuHaggleOutcome[]; art?: Record<string, string>; view?: Partial<StepPickView<RajuHaggleOutcome>>; ms?: number;
} = {}) => renderToStaticMarkup(createElement(rajuHaggleSkin.Field, {
  params: {}, available, still: false, seed: 1, names: { player: "主人公", heroine: "ヒロイン" }, tuning: RAJU_TUNING,
  cast: { heroine: null, person: createElement("i", { "data-testid": "raju-standing" }) },
  art, sound: () => undefined, vibrate: () => undefined, view: { ...at(ms), ...view }, frames: () => () => undefined,
})).replace(/<wbr\/>/gu, "");

describe("the haggle's field", () => {
  it("opens on his boast with his asking price, the lower ones coming, and his standing picture; no patience dots", () => {
    const html = field();
    expect(html).toContain('class="mg-raju-haggle"');
    expect(html).toContain('data-look="boast"');
    expect(html).toContain("五十ルピー！");
    expect(html).toMatch(/data-state="now"[^>]*>.*?₹50/u);
    expect(html).toContain("₹40");
    expect(html).toContain("₹30");
    expect(html).toContain("raju-standing");
    expect(html).not.toContain("mg-raju-haggle-patience");
    expect(html).toContain('data-face="proud"');
  });

  it("shows his tell when his eyes wander (which one from the seed: each means the same)", () => {
    const html = field({ ms: WOBBLE });
    expect(html).toContain('data-look="wobble"');
    expect(html).toContain('data-face="wobble"');
    expect(RAJU_TELLS.map((tell) => tell.lineJa)).toContain(rajuTell(1, at(WOBBLE).mood!.index).lineJa);
    expect(html).toContain(rajuTell(1, at(WOBBLE).mood!.index).lineJa);
    // The seeds spread over his tells.
    expect(new Set(Array.from({ length: 40 }, (_, seed) => rajuTell(seed, 1).id)).size).toBe(RAJU_TELLS.length);
  });

  it("says what a stare did: a landed one (he flinches, 「う……」), a bounced one (he glares, huffy), a new price", () => {
    const landed = field({ view: { ...at(2200, 0, 1, 2000), pushes: 1, landed: 1, lastPush: "landed", pushedAt: 2000 }, ms: 2200 });
    expect(landed).toContain('data-stared="landed"');
    expect(landed).toContain("そんなに見ないで");
    const bounced = field({ view: { pushes: 1, bounces: 1, lastPush: "bounced", pushedAt: 50 } });
    expect(bounced).toContain('data-stared="bounced"');
    expect(bounced).toMatch(/じろじろ見ないでよ！|……ふん！/u);
    expect(bounced).toContain('data-testid="raju-hurt"');
    const forty = field({ view: { ...at(3100, 1, 0, 3000), step: 1, pushes: 2, lastPush: "landed", pushedAt: 3000 }, ms: 3100 });
    expect(forty).toMatch(/data-state="now"[^>]*>.*?₹40/u);
    expect(forty).toContain("……四十なら、いいよ");
  });

  it("pretends to walk away at ₹40 and peeks back; called, he gives in at ₹30", () => {
    const turn = field({ view: { ...at(100, 1, 1, 0), step: 1, landed: 1 }, ms: 100 });
    expect(turn).toContain('data-look="turn"');
    expect(turn).toContain("ほかのお客さん");
    const peek = field({ view: { ...at(RAJU_HAGGLE_TUNING.turnMs + 100, 1, 1, 0), step: 1, landed: 1 }, ms: RAJU_HAGGLE_TUNING.turnMs + 100 });
    expect(peek).toContain('data-look="peek"');
    expect(peek).toContain('data-face="peek"');
    const called = field({ view: { ...at(5100, 2, 0, 5000), step: 2, pushes: 4, lastPush: "called", pushedAt: 5000 }, ms: 5100 });
    expect(called).toContain("わ、わかったよ！　三十！");
    expect(called).toContain('data-look="floor"');
  });

  it("shows his pride hurt in his face, then puffed red cheeks and a red bubble edge, and he stomps off when it is gone", () => {
    expect(field()).not.toContain("raju-hurt");
    const low = field({ view: { bounces: 2 } });
    expect(low).toContain('data-pride="1"');
    expect(low).toContain("raju-hurt");
    expect(low).toContain("#d9705f");
    const out = field({ view: { step: 0, pushes: 3, bounces: 3, ending: { kind: "out" }, outcome: "decline_map" } });
    expect(out).toContain("もういい！");
    expect(out).toContain('data-away="true"');
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

  it("puts the price on the take button, and the price and what he is doing in the top band", () => {
    expect(rajuHaggleSkin.takeDetailJa?.(1, ALL)).toBe("₹40");
    expect(rajuHaggleSkin.takeDetailJa?.(0, ["haggle_map", "decline_map"])).toBe("₹30");
    expect(rajuHaggleSkin.takeDetailJa?.(0, ["decline_map"])).toBe("");
    expect(rajuHaggleSkin.statusJa?.(at(BOAST), ALL)).toBe("₹50　胸を張っている");
    expect(rajuHaggleSkin.statusJa?.(at(WOBBLE), ALL)).toBe("₹50　目が泳いでいる");
    expect(rajuHaggleSkin.statusJa?.({ ...at(BOAST), bounces: 2 }, ALL)).toBe("₹50　むくれている");
    expect(rajuHaggleSkin.statusJa?.(at(BOAST), ["decline_map"])).toBe("買える値段がない　胸を張っている");
  });

  it("asks once more before doing nothing ends it", () => {
    expect(rajuCallJa(at(BOAST), ALL, true, 1, 3, 3)).toBe("……買うの？　買わないの？");
    expect(rajuCallJa({ ...at(BOAST), ending: { kind: "none" } }, ALL, false, 1, 3, 3)).toBe("……買わないの？");
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
    expect(field({ art })).toContain('src="/assets/minigames/glad.webp"');
    expect(field({ art })).not.toContain("raju-standing");
    expect(field({ art, ms: WOBBLE })).toContain('src="/assets/minigames/unsure.webp"');
    expect(field({ art, view: { bounces: 2 } })).toContain('src="/assets/minigames/sulky.webp"');
  });
});
