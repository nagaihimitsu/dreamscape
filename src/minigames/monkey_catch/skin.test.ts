import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { monkeyCatch } from "./definition";
import { MONKEY_END_MS, MONKEY_HANDS_MS, MONKEY_RELEASE_MS, MONKEY_SLIP_MS, MONKEY_TUNING } from "./rules";
import { MONKEY_FIELD_POINTS, monkeyCatchSkin } from "./Skin";

// The catch's art slots (docs/13 2.12): a use's pictures in place of the drawn wall and monkey, and the CSS look without them.
const field = (art: Record<string, string>, thing: "bottle" | "glasses" = "bottle") => renderToStaticMarkup(createElement(monkeyCatchSkin.Field, {
  params: { thing }, still: false, seed: 1, cast: { heroine: createElement("i", { "data-testid": "standing-picture" }) }, names: { player: "主人公", heroine: "ヒロイン" },
  art, sound: () => undefined, vibrate: () => undefined, frames: () => () => undefined,
}));

describe("the catch's field", () => {
  it("draws its own wall and monkey without the use's art, and never the heroine", () => {
    const html = field({});
    expect(html).toContain('class="mg-monkey-catch"');
    expect(html).not.toContain("data-art-wall");
    expect(html).toContain("mg-monkey-catch-monkey-figure");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("standing-picture");
  });

  it("drops the small bottle, or the sunglasses when the tag says thing glasses (its rules are the same)", () => {
    expect(field({})).toContain("mg-monkey-catch-bottle");
    expect(field({})).not.toContain("mg-monkey-catch-glasses");
    expect(field({}, "glasses")).toContain("mg-monkey-catch-glasses");
    expect(field({}, "glasses")).not.toContain("mg-monkey-catch-bottle");
    expect(monkeyCatch.params({ effectIds: [], backgroundIds: [], emotionIds: [] }).parse({})).toEqual({ thing: "bottle" });
  });

  it("lets the thing slip in the monkey's grip before it falls, and draws it in the hands through every late catch or bounce", () => {
    const { untouched, slipAt, ringAt, HELD, HANDS, THROUGH_DEPTH } = MONKEY_FIELD_POINTS;
    expect(slipAt(0)).toBe(0);
    expect(slipAt(MONKEY_SLIP_MS)).toBe(0);
    expect(slipAt(MONKEY_RELEASE_MS)).toBe(1);
    expect(untouched(0)).toEqual(HELD);
    expect(untouched(MONKEY_RELEASE_MS).y).toBeGreaterThan(HELD.y);
    expect(untouched(MONKEY_HANDS_MS)).toEqual(HANDS);
    // A late tap (caught or bounced) closes on it while it slides down the palms, never once it has dropped out.
    for (let late = 0; late <= MONKEY_TUNING.nearLateMs; late += 25) {
      const at = untouched(MONKEY_HANDS_MS + late);
      expect(at.y, String(late)).toBeGreaterThanOrEqual(HANDS.y);
      expect(at.y, String(late)).toBeLessThanOrEqual(HANDS.y + THROUGH_DEPTH);
    }
    expect(untouched(MONKEY_END_MS).y).toBeGreaterThan(125);
    // Larger than before (it was 0.45 to 1): it reads at the monkey's hand and grows to fill the ring.
    expect(HELD.size).toBeGreaterThanOrEqual(0.7);
    expect(HANDS.size).toBeGreaterThan(1);
    // The ring tightens over the last moments of the fall, and is tightest as the thing reaches it.
    expect(ringAt(MONKEY_RELEASE_MS)).toBe(0);
    expect(ringAt(MONKEY_HANDS_MS)).toBe(1);
  });

  it("ends the play as the thing meets the hands or goes past them, holding the rest before the result card", () => {
    const { impactOf } = MONKEY_FIELD_POINTS;
    // Closed a little early, it lands in the hands as it arrives; closed late, as they close.
    expect(impactOf("caught", MONKEY_HANDS_MS - 60)).toBe(MONKEY_HANDS_MS);
    expect(impactOf("caught", MONKEY_HANDS_MS + 100)).toBe(MONKEY_HANDS_MS + 100);
    expect(impactOf("fumbled", MONKEY_HANDS_MS - 150)).toBe(MONKEY_HANDS_MS);
    // Closed far too soon: as it goes past them; too late: as they close on nothing; no tap: once the play is over.
    expect(impactOf("missed", MONKEY_RELEASE_MS + 100)).toBeGreaterThan(MONKEY_HANDS_MS);
    expect(impactOf("missed", MONKEY_HANDS_MS + 400)).toBe(MONKEY_HANDS_MS + 400);
    expect(impactOf("missed", null)).toBe(MONKEY_END_MS);
    for (const [outcome, tapMs] of [["caught", MONKEY_HANDS_MS], ["fumbled", MONKEY_HANDS_MS + 200], ["missed", null]] as const)
      expect(monkeyCatchSkin.endAt({ outcome, tapMs }, false)).toBeGreaterThan(monkeyCatchSkin.impactAt!({ outcome, tapMs }, false));
  });

  it("says the same words before the play and in it", () => {
    expect(monkeyCatchSkin.hintJa).toBe(monkeyCatch.hintJa);
  });

  it("puts the use's pictures in its declared slots", () => {
    expect(monkeyCatch.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["wall", "backdrop"], ["monkey", "sprite"]]);
    const html = field({ wall: "/assets/minigames/wall.webp", monkey: "/assets/minigames/monkey.webp" });
    expect(html).toContain('data-art-wall="true"');
    expect(html).toContain('src="/assets/minigames/wall.webp"');
    expect(html).toContain('src="/assets/minigames/monkey.webp"');
    expect(html).not.toContain("mg-monkey-catch-monkey-figure");
  });
});
