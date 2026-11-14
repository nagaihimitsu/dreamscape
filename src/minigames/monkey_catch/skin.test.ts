import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { monkeyCatch } from "./definition";
import { MONKEY_END_MS, MONKEY_HANDS_MS, MONKEY_RELEASE_MS, MONKEY_TUNING } from "./rules";
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

  it("teases with the thing in its hand, lets it fall and snatches it back, and draws it in the hands through every late catch", () => {
    const { untouched, gripAt, ringAt, shellAt, plan, HELD, HANDS, THROUGH_DEPTH, ledge } = MONKEY_FIELD_POINTS;
    expect(untouched(0)).toEqual(HELD);
    expect(gripAt(0)).toBe("hold");
    // The feint: the arm jerks, the fist closed (it never lets go), the thing dips and comes back.
    expect(gripAt(plan.feint + 50)).toBe("jerk");
    expect(untouched(plan.feint + MONKEY_TUNING.feintMs / 2).y).toBeGreaterThan(HELD.y);
    expect(untouched(plan.feint + MONKEY_TUNING.feintMs)).toEqual(HELD);
    // The fall it snatches back: open hand, falling, then the snap; back in its hand before the real release.
    expect(gripAt(plan.fake.drop + 50)).toBe("open");
    expect(untouched(plan.fake.snatch).y).toBeGreaterThan(HELD.y + 10);
    expect(untouched(plan.fake.snatch).y).toBeLessThan(HANDS.y - 10);
    expect(gripAt(plan.fake.snatch + 50)).toBe("snatch");
    expect(untouched(MONKEY_RELEASE_MS - 1)).toEqual(HELD);
    // The real fall: on the ledge as it clips it, at the hands as it reaches them.
    expect(untouched(plan.ledge)).toEqual(ledge);
    expect(untouched(MONKEY_HANDS_MS)).toEqual(HANDS);
    // A late tap (caught or bounced) closes on it while it slides down the palms, never once it has dropped out.
    for (let late = 0; late <= MONKEY_TUNING.nearLateMs; late += 25) {
      const at = untouched(MONKEY_HANDS_MS + late);
      expect(at.y, String(late)).toBeGreaterThanOrEqual(HANDS.y);
      expect(at.y, String(late)).toBeLessThanOrEqual(HANDS.y + THROUGH_DEPTH);
    }
    expect(untouched(MONKEY_END_MS).y).toBeGreaterThan(125);
    // The shells: dropped, at the hands as their trap says, gone after; in the hands that closed on one.
    expect(shellAt(0, plan.shells[0].drop - 1, null)).toBeNull();
    expect(shellAt(0, plan.shells[0].hands, null)?.y).toBeCloseTo(HANDS.y, 0);
    expect(shellAt(0, plan.shells[0].hands + 1000, null)).toBeNull();
    expect(shellAt(1, MONKEY_HANDS_MS + 300, plan.shells[1].hands)?.y).toBeCloseTo(HANDS.y + 1, 0);
    // The ring tightens for whatever is about to arrive: the shells, the thing.
    for (const at of [plan.shells[0].hands, plan.shells[1].hands, MONKEY_HANDS_MS]) expect(ringAt(at)).toBe(1);
    expect(ringAt(plan.shells[0].drop)).toBe(0);
    expect(HELD.size).toBeGreaterThanOrEqual(0.7);
    expect(HANDS.size).toBeGreaterThan(1);
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
    // Closed at a tease: tossed down past them at once (no shell dropped after it), over about a second after the tap.
    const { plan, thingAt, shellAt, HANDS } = MONKEY_FIELD_POINTS;
    for (const tap of [plan.feint + 200, plan.shells[0].hands, plan.fake.drop + 100, plan.fake.snatch + 300]) {
      expect(impactOf("missed", tap) - tap, String(tap)).toBeLessThanOrEqual(1250);
      expect(monkeyCatchSkin.endAt({ outcome: "missed", tapMs: tap }, false, { thing: "bottle" }) - tap, String(tap)).toBeLessThanOrEqual(2100);
      expect(thingAt(impactOf("missed", tap) - 120, tap, "missed").at.y, String(tap)).toBeCloseTo(HANDS.y, 0);
    }
    expect(shellAt(0, plan.shells[0].drop + 100, plan.feint + 200)).toBeNull();
    expect(shellAt(1, plan.shells[1].drop + 100, plan.shells[0].hands)).toBeNull();
    for (const [outcome, tapMs] of [["caught", MONKEY_HANDS_MS], ["fumbled", MONKEY_HANDS_MS + 200], ["missed", null]] as const)
      expect(monkeyCatchSkin.endAt({ outcome, tapMs }, false, { thing: "bottle" })).toBeGreaterThan(monkeyCatchSkin.impactAt!({ outcome, tapMs }, false, { thing: "bottle" }));
  });

  it("says the same words before the play and in it, and has no meter (the ring is the gauge)", () => {
    expect(monkeyCatchSkin.hintJa).toBe(monkeyCatch.hintJa);
    expect(monkeyCatchSkin.Gauge).toBeNull();
    expect(field({})).toContain("mg-monkey-catch-shell-figure");
    expect(field({})).toContain("mg-monkey-catch-ledge");
    expect(MONKEY_FIELD_POINTS.SHELL_LINE_JA).not.toMatch(/ヒロイン|主人公|……/u);
  });

  it("shows only her face when it gets away (the bottle breaks; the story's next line tells the slip), a short cry at a catch", () => {
    const reaction = (id: string) => monkeyCatch.outcomes.find((outcome) => outcome.id === id)?.reaction;
    expect(reaction("fumbled")).toEqual({ kind: "oops" });
    expect(reaction("missed")).toEqual({ kind: "oops" });
    for (const line of reaction("caught")?.linesJa ?? []) expect(line).not.toContain("……");
    expect(monkeyCatch.sounds).toContain("bat_hit");
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
