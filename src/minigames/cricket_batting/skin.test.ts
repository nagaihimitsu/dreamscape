import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cricketBatting } from "./definition";
import { cricketSkin } from "./Skin";

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

  it("puts the use's pictures in its declared slots", () => {
    expect(cricketBatting.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["pitch", "backdrop"], ["bowler", "sprite"]]);
    const html = field({ pitch: "/assets/minigames/pitch.webp", bowler: "/assets/minigames/bowler.webp" });
    expect(html).toContain('data-art-pitch="true"');
    expect(html).toContain('src="/assets/minigames/pitch.webp"');
    expect(html).toContain('src="/assets/minigames/bowler.webp"');
    expect(html).not.toContain("standing-picture");
  });
});
