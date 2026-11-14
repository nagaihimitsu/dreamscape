import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cricketBatting } from "./definition";
import { CRICKET_FIELD_POINTS, cricketSkin } from "./Skin";

// The cricket's art slots (docs/13 2.12): a use's pictures in place of the drawn pitch and the heroine's standing picture,
// and the CSS look without them.
const field = (art: Record<string, string>) => renderToStaticMarkup(createElement(cricketSkin.Field, {
  params: {}, still: false, seed: 1, cast: { heroine: createElement("i", { "data-testid": "standing-picture" }) }, names: { player: "主人公", heroine: "ヒロイン" },
  art, sound: () => undefined, vibrate: () => undefined, frames: () => () => undefined,
}));

describe("the cricket's field", () => {
  it("draws its own pitch and the heroine's standing picture without the use's art", () => {
    const html = field({});
    expect(html).toContain('class="mg-cricket-batting"');
    expect(html).not.toContain("data-art-pitch");
    expect(html).toContain("standing-picture");
    expect(html).not.toContain("<img");
  });

  it("puts the children beside the pitch, both sides, none cheering before the ball", () => {
    const html = field({});
    expect(html).toContain('data-side="batter"');
    expect(html).toContain('data-side="bowler"');
    expect(html.match(/mg-cricket-batting-kid"/g)).toHaveLength(4);
    expect(html).not.toContain("data-cheer");
    expect(cricketBatting.sounds).toContain("applause");
  });

  it("keeps the card's lines short and her own: one 「……」 at most, her face alone where the story speaks next", () => {
    const lines = cricketBatting.outcomes.flatMap((outcome) => outcome.reaction?.linesJa ?? []);
    expect(lines.filter((line) => line.includes("……")).length).toBeLessThanOrEqual(1);
    const reaction = (id: string) => cricketBatting.outcomes.find((outcome) => outcome.id === id)?.reaction;
    expect(reaction("no_swing")).toEqual({ kind: "oops" });
    // Before the story's 「一瞬の静けさ」: wide-eyed, not laughing.
    expect(reaction("over_wall")).toEqual({ kind: "surprise" });
  });

  it("bowls the bouncer high over the bat and away, then the real ball from her second run-up; the needle waits for the real one", () => {
    const { bouncerBall, bowledBall, phaseAt, meetsAt, plans, OVER, BAT } = CRICKET_FIELD_POINTS;
    const { bouncer, release, contact, script } = plans.quick;
    expect(bouncerBall(bouncer.release - 200)).toBeNull();
    expect(bouncerBall(bouncer.bat)?.ball).toEqual(OVER);
    expect(bouncerBall(bouncer.gone + 1)).toBeNull();
    // Off the crack it climbs (higher on the screen than at its bounce) while its shadow stays on the ground.
    const after = bouncerBall(bouncer.bounce + 150)!;
    expect(after.ball.y).toBeLessThan(bouncerBall(bouncer.bounce)!.ball.y);
    expect(after.ground.y).toBeGreaterThan(bouncerBall(bouncer.bounce)!.ground.y);
    expect(bowledBall(contact).ball.x).toBeCloseTo(BAT.x, 0);
    expect(bowledBall(contact).ball.y).toBe(BAT.y);
    expect([phaseAt(0), phaseAt(bouncer.release), phaseAt(bouncer.gone + 10), phaseAt(release)]).toEqual(["ready", "run1", "walk", "run2"]);
    // A swing at the bouncer meets it as it rises past the plank; one at the real ball, at once.
    expect(meetsAt(bouncer.release + 50)).toBe(bouncer.bat - 80);
    expect(meetsAt(contact)).toBe(contact);
    const progress = cricketSkin.progress!;
    expect(progress(bouncer.bat, {})).toBe(0);
    expect(progress(script.end, {})).toBeCloseTo(1, 9);
    expect(cricketSkin.counts!(bouncer.gone, {})).toBe(false);
    expect(CRICKET_FIELD_POINTS.SORRY_LINE_JA).not.toMatch(/ヒロイン|主人公|……/u);
  });

  it("says the same words before the play and in it", () => {
    expect(cricketSkin.hintJa).toBe(cricketBatting.hintJa);
  });

  it("puts the use's pictures in its declared slots", () => {
    expect(cricketBatting.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["pitch", "backdrop"], ["bowler", "sprite"]]);
    const html = field({ pitch: "/assets/minigames/pitch.webp", bowler: "/assets/minigames/bowler.webp" });
    expect(html).toContain('data-art-pitch="true"');
    expect(html).toContain('src="/assets/minigames/pitch.webp"');
    expect(html).toContain('src="/assets/minigames/bowler.webp"');
    expect(html).not.toContain("standing-picture");
  });
});
