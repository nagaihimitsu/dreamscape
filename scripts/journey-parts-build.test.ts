import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { LAST_JOURNEY_KEY, openingJourneyId } from "../src/app/last-journey";
import { journeyPartPreloadScript } from "./journey-parts-build";

// The page script of index.html that starts loading the opening journey's part (scripts/journey-parts-build.ts):
// run in a small page of its own, it must pick the journey the title opens (openingJourneyId).
const journeys = [
  { id: "milano", status: "available" },
  { id: "golden_triangle", status: "available" },
  { id: "uzbekistan", status: "preparing" },
];
const parts = { milano: "./assets/milano-m1.js", golden_triangle: "./assets/golden_triangle-g1.js" };

/** The links the script adds, with `stored` as the remembered journey (a function: the storage throws). */
function preloads(stored: string | null | (() => never)): { rel: string; href: string; crossOrigin: string | null }[] {
  const added: { rel: string; href: string; crossOrigin: string | null }[] = [];
  runInNewContext(journeyPartPreloadScript(parts, "milano"), {
    localStorage: { getItem: (key: string) => (key !== LAST_JOURNEY_KEY ? null : typeof stored === "function" ? stored() : stored) },
    document: {
      createElement: () => ({ rel: "", href: "", crossOrigin: null }),
      head: { appendChild: (link: { rel: string; href: string; crossOrigin: string | null }) => added.push(link) },
    },
  });
  return added;
}

describe("journey part preload", () => {
  it("preloads the part of the journey the title opens", () => {
    for (const stored of [null, "milano", "golden_triangle", "uzbekistan", "gone_journey", "__proto__", "toString"]) {
      const opening = openingJourneyId(stored, journeys, "milano");
      expect(preloads(stored), String(stored)).toEqual([{ rel: "modulepreload", href: parts[opening as keyof typeof parts], crossOrigin: "" }]);
    }
  });

  it("falls back to the default journey when the storage cannot be read", () => {
    expect(preloads(() => { throw new Error("blocked"); }).map((link) => link.href)).toEqual(["./assets/milano-m1.js"]);
  });
});
