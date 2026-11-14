import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { clothFlap } from "./definition";
import { CLOTH_END_MS, CLOTH_START_MS, CLOTH_STEPS, CLOTH_TUNING, clothFlapRules } from "./rules";
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

  it("walks her down her wary way, standing on the gold step exactly while a flap is perfect, on down past it to the end", () => {
    const { footOn, NICHE, nicheMs, walkerAt, plan, LAST_STEP } = CLOTH_FIELD_POINTS;
    const { cleanEarlyMs, cleanLateMs } = CLOTH_TUNING;
    expect(walkerAt(0).foot).toEqual(footOn(0));
    expect(walkerAt(CLOTH_START_MS).foot).toEqual(footOn(0));
    expect(footOn(CLOTH_STEPS.gold)).toEqual(NICHE);
    // The picture is the judgement: on the gold step through the whole perfect window, never outside it.
    for (let ms = nicheMs - cleanEarlyMs; ms <= nicheMs + cleanLateMs; ms += 10) {
      expect(walkerAt(ms).foot, String(ms - nicheMs)).toEqual(NICHE);
      expect(clothFlapRules.outcomeOf(ms, {})).toBe("perfect");
    }
    expect(walkerAt(nicheMs - cleanEarlyMs - 15).foot).not.toEqual(NICHE);
    expect(walkerAt(nicheMs + cleanLateMs + 15).foot).not.toEqual(NICHE);
    expect(clothFlapRules.outcomeOf(nicheMs - cleanEarlyMs - 15, {})).toBe("early");
    expect(clothFlapRules.outcomeOf(nicheMs + cleanLateMs + 15, {})).toBe("late");
    // Never on the gold step before the leap (the boy is; her reached foot only points at it).
    for (let ms = CLOTH_START_MS; ms < nicheMs - cleanEarlyMs; ms += 20) expect(walkerAt(ms).step, String(ms)).toBeLessThan(CLOTH_STEPS.gold);
    // Her leap is higher than a step; her step back lands on the third step again.
    const leap = plan.moves.find((move) => move.kind === "leap")!;
    expect(walkerAt((leap.lift + leap.land) / 2).lift).toBeGreaterThan(2);
    const back = plan.moves.find((move) => move.kind === "back")!;
    expect(walkerAt(back.land + 10).foot).toEqual(footOn(CLOTH_STEPS.wary));
    expect(walkerAt(CLOTH_END_MS).foot).toEqual(footOn(LAST_STEP));
    expect(walkerAt(CLOTH_END_MS + 5000).foot).toEqual(footOn(LAST_STEP));
  });

  it("tells each change before it: her look, her freeze, her bobs and the held one; the boy comes and goes on his own", () => {
    const { poseAt, crouchAt, reachAt, boyAt, plan } = CLOTH_FIELD_POINTS;
    const [decoy, freeze, feint, held] = plan.script.traps;
    expect(poseAt(CLOTH_START_MS)).toBe("walk");
    expect(poseAt(decoy.at)).toBe("wary");
    expect(poseAt(freeze.tellAt)).toBe("freeze");
    expect(poseAt(freeze.tellAt - 1)).toBe("walk");
    expect(reachAt(feint.tellAt + CLOTH_TUNING.feintMs / 2)).toBeCloseTo(1, 1);
    expect(reachAt(feint.tellAt - 1)).toBe(0);
    expect(poseAt(held.tellAt)).toBe("hold");
    expect(crouchAt(plan.bobs[0])).toBeCloseTo(1, 5);
    expect(crouchAt(plan.bobs[0] + CLOTH_TUNING.bobMs / 2)).toBeCloseTo(0, 5);
    // Held: crouched from the third bob until the leap, then up.
    const leap = plan.moves.find((move) => move.kind === "leap")!;
    expect(crouchAt(held.tellAt + 100)).toBe(1);
    expect(crouchAt(leap.lift)).toBe(0);
    // The boy: on the stairs from his start until he has run off the bottom, on the gold step at his trap.
    expect(boyAt(plan.boy[0].lift - 1)).toBeNull();
    expect(boyAt(decoy.at)?.foot).toEqual(CLOTH_FIELD_POINTS.footOn(CLOTH_STEPS.gold));
    expect(boyAt(plan.boy[plan.boy.length - 1].land)).toBeNull();
    expect(CLOTH_FIELD_POINTS.WAIT_LINE_JA).not.toMatch(/ヒロイン|主人公/u);
  });

  it("marks the step she is on: one lights as her foot lands, one goes out as she steps back, the gold one as she lands on it", () => {
    const { stepAt, plan, nicheMs } = CLOTH_FIELD_POINTS;
    expect(stepAt(CLOTH_START_MS)).toBe(0);
    expect(stepAt(plan.moves[0].land - 1)).toBe(0);
    expect(stepAt(plan.moves[0].land)).toBe(1);
    const back = plan.moves.find((move) => move.kind === "back")!;
    expect(stepAt(back.lift - 1)).toBe(CLOTH_STEPS.freeze);
    expect(stepAt(back.land)).toBe(CLOTH_STEPS.wary);
    expect(stepAt(nicheMs - CLOTH_TUNING.cleanEarlyMs - 1)).toBe(CLOTH_STEPS.wary);
    expect(stepAt(nicheMs - CLOTH_TUNING.cleanEarlyMs)).toBe(CLOTH_STEPS.gold);
    expect(field({})).toContain("mg-cloth-flap-mark-step");
    expect(field({})).toContain("mg-cloth-flap-boy-figure");
    expect(clothFlapSkin.Gauge).toBeDefined();
  });

  it("lets her finish stepping off the gold step after a late flap before she turns (never turned on the gold step)", () => {
    const { nicheMs, walkerAt, stopsAt, standsAt, reactionOf, footOn, NICHE, plan } = CLOTH_FIELD_POINTS;
    const next = plan.moves.find((move) => move.from === CLOTH_STEPS.gold)!;
    for (let late = CLOTH_TUNING.cleanLateMs + 1; late <= CLOTH_TUNING.nearLateMs + CLOTH_TUNING.hurryMs; late += 10) {
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
    expect(stopsAt("late", next.lift + 20)).toBe(next.land);
    expect(walkerAt(stopsAt("late", next.lift + 20)).foot).toEqual(footOn(next.to));
    // Standing on a step, she stops at once; an early or perfect flap stops her where she is; no flap, never.
    expect(standsAt(next.land + 10)).toBe(next.land + 10);
    expect(stopsAt("early", nicheMs - 150)).toBe(nicheMs - 150);
    expect(stopsAt("perfect", nicheMs)).toBe(nicheMs);
    expect(stopsAt("frozen", null)).toBe(Number.POSITIVE_INFINITY);
  });

  it("rings one footstep a landing, the gold one higher and louder than the four before it", () => {
    const { footstepLevel } = CLOTH_FIELD_POINTS;
    expect(clothFlap.sounds).toContain("footstep");
    expect(clothFlap.sounds).not.toContain("travel_walk");
    const gold = footstepLevel(CLOTH_STEPS.gold);
    expect(gold.rate).toBeGreaterThan(1);
    expect(gold.volume).toBeGreaterThan(footstepLevel(1).volume);
    expect(footstepLevel(CLOTH_STEPS.gold + 1).volume).toBeLessThan(footstepLevel(1).volume);
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
      [clothFlapSkin.impactAt!({ outcome, tapMs }, false, {}), clothFlapSkin.endAt({ outcome, tapMs }, false, {})];
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

  it("keeps the card's lines short: one 「……」 at most (her pause at the frozen pigeon)", () => {
    const lines = clothFlap.outcomes.flatMap((outcome) => outcome.reaction?.linesJa ?? []);
    expect(lines.filter((line) => line.includes("……"))).toEqual(["……鳩、固まってる？"]);
  });
});
