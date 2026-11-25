import { describe, expect, it } from "vitest";
import { BAND_FILL_SHARE, bandColours, contrast, speakerSpot } from "./name-band";
import type { Stage, StageFocus } from "./scene-stage";

const her = (stage: Omit<Stage, "heroine">): Stage => ({ heroine: true, ...stage });
const person = (figure: string) => ({ figure });

describe("the speaker's name band (name-band)", () => {
  it("stands over the one speaking, in the places of the stage's layouts", () => {
    const alone: StageFocus = { heroine: "speaking" };
    expect(speakerSpot(her({}), alone)).toEqual({ figure: "heroine", x: 0.5 });
    // She and one person: halves; the person on the right speaks.
    expect(speakerSpot(her({ opposite: person("gt_zoheb") }), { heroine: "listening", opposite: "speaking" }))
      .toEqual({ figure: "gt_zoheb", x: 0.75 });
    // Three in a row: the one in the middle speaks (Hamid between her and Zoheb).
    const three = her({ opposite: person("gt_hamid"), beside: person("gt_zoheb") });
    expect(speakerSpot(three, { heroine: "listening", opposite: "speaking", beside: "listening" })).toEqual({ figure: "gt_hamid", x: 0.5 });
    expect(speakerSpot(three, { heroine: "listening", opposite: "listening", beside: "speaking" })?.x).toBeCloseTo(5 / 6);
    // Four in a row: quarters.
    const four = her({ opposite: person("a"), beside: person("b"), far: person("c") });
    expect(speakerSpot(four, { far: "speaking" })?.x).toBeCloseTo(7 / 8);
    // Without her: one alone in the middle, two in halves.
    expect(speakerSpot({ heroine: false, opposite: person("a") }, { opposite: "speaking" })?.x).toBe(0.5);
    expect(speakerSpot({ heroine: false, opposite: person("a"), beside: person("b") }, { opposite: "speaking" })?.x).toBe(0.25);
  });

  it("keeps her place on the battle's stage, and stands over no one when no one on stage speaks", () => {
    expect(speakerSpot({ heroine: false, opposite: person("a") }, { opposite: "speaking" }, "battle")?.x).toBe(0.75);
    expect(speakerSpot(her({ opposite: person("a") }), {})).toBeUndefined();
    expect(speakerSpot(her({ opposite: person("a") }), { heroine: "listening", opposite: "listening" })).toBeUndefined();
  });

  it("writes the name in white or navy, whichever reads, and moves the fill only as far as 4.5:1 needs over any backdrop", () => {
    // White clothes: navy ink, the fill as it is.
    expect(bandColours({ fill: "#F8F4F2", edge: "#3B3739" })).toEqual({ fill: "#f8f4f2", edge: "#3b3739", ink: "#1d2740" });
    // Deep blue: white ink, the fill as it is.
    expect(bandColours({ fill: "#132455", edge: "#4d5679" })).toMatchObject({ fill: "#132455", ink: "#ffffff" });
    // Mid tones read in neither at 4.5:1 once the band lets the scene through: the fill moves until they do.
    const seenOver = (fill: string, behind: number) => {
      const channel = (at: number) => Math.round(parseInt(fill.slice(at, at + 2), 16) * BAND_FILL_SHARE + behind * (1 - BAND_FILL_SHARE));
      return `#${[1, 3, 5].map((at) => channel(at).toString(16).padStart(2, "0")).join("")}`;
    };
    for (const fill of ["#918788", "#7f7f7f", "#c64e2f", "#e7a3a0", "#3d6aa6"]) {
      const shown = bandColours({ fill, edge: "#000000" });
      for (const behind of [0, 255]) expect(contrast(seenOver(shown.fill, behind), shown.ink)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
