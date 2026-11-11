// The heroine's few words by a chosen place's card in free time (2026-11-11 user decision): a place's optional
// heroineLinesJa, the first that holds now. The sample journey's fictional 見本の街 writes them on two places.
import { describe, expect, it } from "vitest";
import { getCityContent } from "../../content";
import { cityStart } from "../../dev/scenario-builders";
import { placeHeroineLine } from "./place-heroine-line";

const SAMPLE = "mihon";
const place = (id: string) => getCityContent(SAMPLE).travel.places.find((item) => item.id === id)!;

describe("the heroine's line by a chosen place's card", () => {
  it("says the first line that holds now: a conditional one first, else the plain one", () => {
    const tower = place("mihon_clock_tower");
    const [afterVisit, beforeVisit] = tower.heroineLinesJa!;
    expect(typeof afterVisit).toBe("object");
    expect(typeof beforeVisit).toBe("string");
    const start = cityStart(SAMPLE, ["航", "澪"]);
    expect(placeHeroineLine(start, tower)).toBe(beforeVisit);
    expect(placeHeroineLine({ ...start, visitedLandmarkIds: ["mihon_clock_tower"] }, tower)).toBe((afterVisit as { textJa: string }).textJa);
  });

  it("fills the names set in, and shows nothing for a place without lines or with none holding", () => {
    const start = cityStart(SAMPLE, ["航", "澪"]);
    expect(placeHeroineLine(start, place("mihon_market"))).toMatch(/^航、/u);
    expect(place("mihon_library").heroineLinesJa).toBeUndefined();
    expect(placeHeroineLine(start, place("mihon_library"))).toBeNull();
    expect(placeHeroineLine(start, { heroineLinesJa: [{ textJa: "{heroine_name}も来たかった", when: { landmarkVisited: "mihon_library" } }] })).toBeNull();
    expect(placeHeroineLine({ ...start, visitedLandmarkIds: ["mihon_library"] },
      { heroineLinesJa: [{ textJa: "{heroine_name}も来たかった", when: { landmarkVisited: "mihon_library" } }] })).toBe("澪も来たかった");
  });
});
