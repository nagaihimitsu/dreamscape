import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tourismClueSchema } from "../../../src/content/tourism-schemas";
import { resolvePublicFile } from "../../public-assets";

const research = "authoring/journeys/golden_triangle/research/golden-triangle-20261103/source/data";
const draft = JSON.parse(readFileSync("authoring/journeys/golden_triangle/drafts/observation-cards.json", "utf8"));
const facts = JSON.parse(readFileSync(`${research}/TOURISM_FACTS.json`, "utf8")) as Array<{ id: string; sourceId: string; summaryJa: string; cityId: string; classification: string; useWithoutFurtherResearch: boolean }>;
const sources = JSON.parse(readFileSync(`${research}/SOURCES.json`, "utf8")) as Array<{ id: string; url: string }>;

describe("India authoring observation cards", () => {
  it("keeps 12 places in the three cities, valid schema, original claims, and no invented quiz links", () => {
    expect(draft.status).toBe("authoring_only");
    expect(Object.keys(draft.images)).toHaveLength(12);
    expect(new Set(Object.values(draft.provenance).map((v) => (v as { cityId: string }).cityId))).toEqual(new Set(["delhi", "agra", "jaipur"]));
    const ids = new Set<string>();
    for (const raw of draft.clues) {
      const clue = tourismClueSchema.parse(raw);
      expect(ids.has(clue.id)).toBe(false);
      ids.add(clue.id);
      expect(clue.relatedQuestionIds).toEqual([]);
      const fact = facts.find((item) => item.id === clue.factId);
      expect(fact).toBeDefined();
      const correctedMuseumCard = clue.factId === "fact_jaipur_city_palace_02";
      if (correctedMuseumCard) expect(clue.descriptionJa).toContain("この写真には写っていない");
      else expect(clue.descriptionJa).toBe(fact!.summaryJa);
      expect(clue.sources[0].claimType).toBe(fact!.classification);
      const followupSources: Record<string, string> = {
        fact_jaipur_hawa_mahal_01: "https://www.incredibleindia.gov.in/en/rajasthan/jaipur/hawa-mahal",
        fact_jaipur_hawa_mahal_02: "https://www.incredibleindia.gov.in/en/rajasthan/jaipur/hawa-mahal",
        fact_jaipur_city_palace_01: "https://citypalace.org/",
        fact_jaipur_city_palace_02: "https://citypalace.org/pdfs/Brochure.pdf",
      };
      expect(clue.sources[0].url).toBe(followupSources[clue.factId] ?? sources.find((item) => item.id === fact!.sourceId)?.url);
      expect(draft.provenance[clue.id].needsFurtherResearch).toBe(!fact!.useWithoutFurtherResearch && !followupSources[clue.factId]);
      expect(draft.images[clue.landmarkId]).toBeDefined();
      expect(Boolean(draft.provenance[clue.id].visualEvidence)).toBe(clue.kind === "hotspot");
    }
  });

  it("ties observed regions to the exact reviewed photos", () => {
    for (const entry of Object.values(draft.images) as Array<{ path: string; sha256: string }>) {
      expect(createHash("sha256").update(readFileSync(resolvePublicFile(process.cwd(), entry.path))).digest("hex")).toBe(entry.sha256);
    }
  });
});
