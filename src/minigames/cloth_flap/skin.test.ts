import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { clothFlap } from "./definition";
import { CLOTH_END_MS, CLOTH_FIELD, CLOTH_START_MS, CLOTH_TUNING, clothFlapRules } from "./rules";
import { CLOTH_FIELD_POINTS, clothFlapSkin } from "./Skin";

// The flap's art slots (docs/13 2.12) and her walk: a use's pictures in place of the drawn stairs and figure, the CSS look
// without them, and her foot on the step in front of the niche at the moment to tap.
const field = (art: Record<string, string>) => renderToStaticMarkup(createElement(clothFlapSkin.Field, {
  params: {}, still: false, seed: 1, cast: { heroine: createElement("i", { "data-testid": "standing-picture" }) }, names: { player: "主人公", heroine: "ヒロイン" },
  art, sound: () => undefined, vibrate: () => undefined, frames: () => () => undefined,
}));

describe("the flap's field", () => {
  it("draws its own stairs and figure without the use's art, and never the heroine", () => {
    const html = field({});
    expect(html).toContain('class="mg-cloth-flap"');
    expect(html).not.toContain("data-art-stairs");
    expect(html).toContain("mg-cloth-flap-walker-figure");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("standing-picture");
  });

  it("puts the use's pictures in its declared slots", () => {
    expect(clothFlap.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["stairs", "backdrop"], ["wall", "backdrop"], ["walker", "sprite"]]);
    const html = field({ stairs: "/assets/minigames/stairs.webp", walker: "/assets/minigames/walker.webp" });
    expect(html).toContain('data-art-stairs="true"');
    expect(html).toContain('src="/assets/minigames/stairs.webp"');
    expect(html).toContain('src="/assets/minigames/walker.webp"');
    expect(html).not.toContain("mg-cloth-flap-walker-figure");
  });

  it("puts a far-wall picture (a photo) under the drawn stairs, figure and cloth", () => {
    const html = field({ wall: "/assets/tourism/india/wall.webp" });
    expect(html).toContain('data-art-wall="true"');
    expect(html).not.toContain("data-art-stairs");
    expect(html).toContain('src="/assets/tourism/india/wall.webp"');
    expect(html).toContain("mg-cloth-flap-stairs");
    expect(html).toContain("mg-cloth-flap-walker-figure");
    expect(html).toContain("mg-cloth-flap-cloth");
  });

  it("walks her down one step at a time, standing on the gold step exactly while a flap is perfect, on down past it to the end", () => {
    const { footOn, NICHE, nicheMs, walkerAt, landingOf, LAST_STEP } = CLOTH_FIELD_POINTS;
    const { cleanEarlyMs, cleanLateMs } = CLOTH_TUNING;
    expect(walkerAt(0).foot).toEqual(footOn(0));
    expect(walkerAt(CLOTH_START_MS).foot).toEqual(footOn(0));
    expect(footOn(CLOTH_FIELD.stepsToNiche)).toEqual(NICHE);
    // The picture is the judgement: on the gold step through the whole perfect window, never outside it.
    for (let ms = nicheMs - cleanEarlyMs; ms <= nicheMs + cleanLateMs; ms += 10) {
      expect(walkerAt(ms).foot, String(ms - nicheMs)).toEqual(NICHE);
      expect(clothFlapRules.outcomeOf(ms, {})).toBe("perfect");
    }
    expect(walkerAt(nicheMs - cleanEarlyMs - 15).foot).not.toEqual(NICHE);
    expect(walkerAt(nicheMs + cleanLateMs + 15).foot).not.toEqual(NICHE);
    expect(clothFlapRules.outcomeOf(nicheMs - cleanEarlyMs - 15, {})).toBe("early");
    expect(clothFlapRules.outcomeOf(nicheMs + cleanLateMs + 15, {})).toBe("late");
    // Her foot lands on the gold step as the perfect window opens; each step's landing is a step's length after the last.
    expect(landingOf(CLOTH_FIELD.stepsToNiche)).toBe(nicheMs - cleanEarlyMs);
    expect(landingOf(2) - landingOf(1)).toBe(CLOTH_FIELD.stepMs);
    expect(walkerAt(CLOTH_END_MS).foot).toEqual(footOn(LAST_STEP));
    expect(walkerAt(CLOTH_END_MS + 5000).foot).toEqual(footOn(LAST_STEP));
  });

  it("lights a step's mark as her foot lands on it, the gold one as the perfect window opens", () => {
    const { stepsLanded, landingOf, nicheMs } = CLOTH_FIELD_POINTS;
    expect(stepsLanded(CLOTH_START_MS)).toBe(0);
    expect(stepsLanded(landingOf(1) - 1)).toBe(0);
    expect(stepsLanded(landingOf(1))).toBe(1);
    expect(stepsLanded(nicheMs - CLOTH_TUNING.cleanEarlyMs - 1)).toBe(CLOTH_FIELD.stepsToNiche - 1);
    expect(stepsLanded(nicheMs - CLOTH_TUNING.cleanEarlyMs)).toBe(CLOTH_FIELD.stepsToNiche);
    expect(field({})).toContain("mg-cloth-flap-mark-step");
    expect(clothFlapSkin.Gauge).toBeDefined();
  });

  it("lets her finish stepping off the gold step after a late flap before she turns (never turned on the gold step)", () => {
    const { nicheMs, standAfter, walkerAt, stopsAt, standsAt, landingOf, reactionOf, footOn, NICHE } = CLOTH_FIELD_POINTS;
    const next = CLOTH_FIELD.stepsToNiche + 1;
    for (let late = CLOTH_TUNING.cleanLateMs + 1; late <= CLOTH_TUNING.nearLateMs + CLOTH_FIELD.stepMs; late += 10) {
      const tapMs = nicheMs + late;
      expect(clothFlapRules.outcomeOf(tapMs, {}), String(late)).toBe("late");
      const turnsAt = reactionOf("late", tapMs).at;
      // By the time she turns, her foot is down on a step (not in the air, not on the gold one).
      const { foot, lift } = walkerAt(Math.min(turnsAt, stopsAt("late", tapMs)));
      expect(lift, String(late)).toBe(0);
      expect(foot, String(late)).not.toEqual(NICHE);
      expect(turnsAt, String(late)).toBeGreaterThanOrEqual(stopsAt("late", tapMs) + 40);
    }
    // A flap just as she steps off: she lands on the next step, then turns there.
    expect(stopsAt("late", nicheMs + standAfter + 50)).toBe(landingOf(next));
    expect(walkerAt(stopsAt("late", nicheMs + 200)).foot).toEqual(footOn(next));
    // Standing on a step, she stops at once; an early or perfect flap stops her where she is; no flap, never.
    expect(standsAt(landingOf(next) + 10)).toBe(landingOf(next) + 10);
    expect(stopsAt("early", nicheMs - 150)).toBe(nicheMs - 150);
    expect(stopsAt("perfect", nicheMs)).toBe(nicheMs);
    expect(stopsAt("frozen", null)).toBe(Number.POSITIVE_INFINITY);
  });

  it("rings one footstep a landing, the gold one higher and louder than the four before it", () => {
    const { footstepLevel } = CLOTH_FIELD_POINTS;
    expect(clothFlap.sounds).toContain("footstep");
    expect(clothFlap.sounds).not.toContain("travel_walk");
    const gold = footstepLevel(CLOTH_FIELD.stepsToNiche);
    expect(gold.rate).toBeGreaterThan(1);
    expect(gold.volume).toBeGreaterThan(footstepLevel(1).volume);
    expect(footstepLevel(CLOTH_FIELD.stepsToNiche + 1).volume).toBeLessThan(footstepLevel(1).volume);
  });

  it("shows the pigeon in two still places with less motion (it still leaves the niche), gliding otherwise", () => {
    const { pigeonAlong } = CLOTH_FIELD_POINTS;
    expect(pigeonAlong(0.2, true)).toBeLessThan(0.5);
    expect(pigeonAlong(0.8, true)).toBeGreaterThan(0.5);
    expect(pigeonAlong(0.2, true)).toBe(pigeonAlong(0.4, true));
    expect(pigeonAlong(0.3, false)).toBe(0.3);
  });

  it("ends the play as she reacts (the host's finish over it), and holds the rest of the picture before the result card", () => {
    const { nicheMs } = CLOTH_FIELD_POINTS;
    const at = (outcome: "perfect" | "early" | "late" | "frozen", tapMs: number | null) =>
      [clothFlapSkin.impactAt!({ outcome, tapMs }, false), clothFlapSkin.endAt({ outcome, tapMs }, false)];
    expect(at("perfect", nicheMs)).toEqual([nicheMs + 120, nicheMs + 120 + 850]);
    // An early flap ends as she sees it; the pigeon and her scream come in the hold.
    const [earlyImpact, earlyEnd] = at("early", nicheMs - 600);
    expect(earlyImpact).toBe(nicheMs - 480);
    expect(earlyEnd).toBeGreaterThan(earlyImpact + 450);
    expect(at("frozen", null)[0]).toBe(CLOTH_END_MS);
  });

  it("says the same words before the play and in it", () => {
    expect(clothFlapSkin.hintJa).toBe(clothFlap.hintJa);
  });
});
