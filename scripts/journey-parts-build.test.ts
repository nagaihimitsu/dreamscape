import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { LAST_JOURNEY_KEY, readLastJourney, readRecentJourneys, RECENT_JOURNEYS_KEY, titleJourneyId } from "../src/app/last-journey";
import { KEPT_JOURNEYS_KEY, readKeptJourneys } from "../src/offline/kept-journeys";
import { journeyPartPreloadScript } from "./journey-parts-build";

// The page script of index.html that starts loading the opening journey's part (scripts/journey-parts-build.ts):
// run in a small page of its own, it must pick the journey the title opens (titleJourneyId), with a network and
// without one (user decision 2026-11-17, 「A」: a kept journey), on the same storage.
const journeys = [
  { id: "milano", status: "available" },
  { id: "golden_triangle", status: "available" },
  { id: "uzbekistan", status: "preparing" },
  { id: "jaipur", status: "available" },
];
const parts = { milano: "./assets/milano-m1.js", golden_triangle: "./assets/golden_triangle-g1.js", jaipur: "./assets/jaipur-j1.js" };

type Stored = Partial<Record<string, string | null>>;
const storageOf = (stored: Stored | "refusing") => ({
  getItem: (key: string) => {
    if (stored === "refusing") throw new Error("blocked");
    return stored[key] ?? null;
  },
});

/** The links the script adds for this storage and network. */
function preloads(stored: Stored | "refusing", online: boolean): { rel: string; href: string; crossOrigin: string | null }[] {
  const added: { rel: string; href: string; crossOrigin: string | null }[] = [];
  runInNewContext(journeyPartPreloadScript(parts, "milano"), {
    localStorage: storageOf(stored),
    navigator: { onLine: online },
    document: {
      createElement: () => ({ rel: "", href: "", crossOrigin: null }),
      head: { appendChild: (link: { rel: string; href: string; crossOrigin: string | null }) => added.push(link) },
    },
  });
  return added;
}
/** The journey the title opens for this storage and network (App.tsx reads it the same way). */
function titleOpens(stored: Stored | "refusing", online: boolean): string {
  const storage = storageOf(stored);
  return titleJourneyId({ remembered: readLastJourney(storage), recent: readRecentJourneys(storage), kept: readKeptJourneys(storage), online }, journeys, "milano");
}

describe("journey part preload", () => {
  const remembered = [null, "milano", "golden_triangle", "uzbekistan", "jaipur", "gone_journey", "__proto__", "toString"];
  const recents = [null, '["jaipur","milano"]', '["golden_triangle","jaipur"]', '["uzbekistan",3,"__proto__"]', "jaipur", "{}"];
  const kepts = [null, "[]", '["milano"]', '["jaipur"]', '["jaipur","golden_triangle"]', '["uzbekistan"]', '["toString",1]', "milano", "{]"];

  it("preloads the part of the journey the title opens, for every remembered journey, recent list, kept list and network", () => {
    let offlineOtherThanRemembered = 0;
    for (const online of [true, false]) {
      for (const last of remembered) {
        for (const recent of recents) {
          for (const kept of kepts) {
            const stored = { [LAST_JOURNEY_KEY]: last, [RECENT_JOURNEYS_KEY]: recent, [KEPT_JOURNEYS_KEY]: kept };
            const opening = titleOpens(stored, online);
            if (!online && opening !== titleOpens(stored, true)) offlineOtherThanRemembered += 1;
            expect(preloads(stored, online), JSON.stringify({ online, ...stored })).toEqual([{ rel: "modulepreload", href: parts[opening as keyof typeof parts], crossOrigin: "" }]);
          }
        }
      }
    }
    // The grid reaches the offline rule (a kept journey other than the one a network would open), not only the fallback.
    expect(offlineOtherThanRemembered).toBeGreaterThan(50);
  });

  it("falls back to the default journey when the storage cannot be read", () => {
    for (const online of [true, false]) {
      expect(preloads("refusing", online).map((link) => link.href)).toEqual(["./assets/milano-m1.js"]);
      expect(titleOpens("refusing", online)).toBe("milano");
    }
  });
});
