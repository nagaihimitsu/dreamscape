/** Generate authoring-only observation cards from the integrated research.
 * The image regions were checked against the exact photographs recorded in the output.
 * No entry here creates a playable landmark, scenario, or quiz.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { tourismClueSchema, type ObservationRegion } from "../src/content/tourism-schemas";
import { resolvePublicFile } from "./public-assets";

interface Fact {
  id: string; placeId: string; cityId: string; titleJa: string; summaryJa: string;
  classification: "documented_fact" | "interpretation" | "hypothesis" | "legend";
  reliability: string; sourceId: string; sourceUrl: string; checkedAt: string;
  observationPotential: boolean; useWithoutFurtherResearch: boolean;
}
interface Source { id: string; publisher: string; title: string; url: string; checkedAt: string }
type Selection = { id: string; region?: ObservationRegion; visualEvidence?: string };
// Regions are image-relative x/y/width/height. Only claim subject visible in the
// specific photo is marked. Historical facts themselves are supported by the source.
const selected: Selection[] = [
  { id: "fact_delhi_red_fort_01", region: { x: 0.23, y: 0.19, width: 0.48, height: 0.53 }, visualEvidence: "赤い要塞門と城壁" },
  { id: "fact_delhi_red_fort_02" },
  { id: "fact_delhi_red_fort_03" },
  { id: "fact_delhi_qutb_minar_01" },
  { id: "fact_delhi_qutb_minar_02" },
  { id: "fact_delhi_humayun_tomb_01", region: { x: 0.36, y: 0.38, width: 0.4, height: 0.26 }, visualEvidence: "庭園の奥にあるフマユーン廟" },
  { id: "fact_delhi_humayun_tomb_02" },
  { id: "fact_delhi_humayun_tomb_03" },
  { id: "fact_delhi_jama_masjid_01" },
  { id: "fact_delhi_jama_masjid_02", region: { x: 0.59, y: 0.02, width: 0.14, height: 0.54 }, visualEvidence: "赤と白の帯が見える塔" },
  { id: "fact_agra_taj_mahal_01", region: { x: 0.36, y: 0.04, width: 0.3, height: 0.45 }, visualEvidence: "庭園の奥に見える白い廟" },
  { id: "fact_agra_taj_mahal_02" },
  { id: "fact_agra_taj_mahal_03" },
  { id: "fact_agra_agra_fort_01", region: { x: 0.14, y: 0.13, width: 0.72, height: 0.63 }, visualEvidence: "赤砂岩の城壁と門" },
  { id: "fact_agra_agra_fort_02" },
  { id: "fact_agra_itimad_tomb_01" },
  { id: "fact_agra_itimad_tomb_02", region: { x: 0.36, y: 0.28, width: 0.44, height: 0.54 }, visualEvidence: "白大理石の墓廟" },
  { id: "fact_agra_itimad_tomb_03" },
  { id: "fact_agra_fatehpur_sikri_01", region: { x: 0.03, y: 0.17, width: 0.41, height: 0.48 }, visualEvidence: "旧都に残る赤砂岩の建物" },
  { id: "fact_agra_fatehpur_sikri_02" },
  { id: "fact_jaipur_amber_fort_01" },
  { id: "fact_jaipur_amber_fort_02" },
  { id: "fact_jaipur_hawa_mahal_01", region: { x: 0.14, y: 0.13, width: 0.57, height: 0.48 }, visualEvidence: "街路に面した多数の小窓" },
  { id: "fact_jaipur_hawa_mahal_02" },
  { id: "fact_jaipur_city_palace_01", region: { x: 0.23, y: 0.18, width: 0.66, height: 0.48 }, visualEvidence: "シティ・パレスの中庭から見た建物" },
  { id: "fact_jaipur_city_palace_02" },
  { id: "fact_jaipur_jantar_mantar_01" },
  { id: "fact_jaipur_jantar_mantar_02", region: { x: 0.4, y: 0.2, width: 0.5, height: 0.48 }, visualEvidence: "屋外に設置された大きな観測装置" },
  { id: "fact_jaipur_jantar_mantar_03" },
];
// Supplement the original four interpretation ideas with directly checked
// sources. The research ZIP remains immutable and traceable through factId.
// City Palace's four gates are not in the selected photo; that card stays a document.
const followup: Record<string, { publisher: string; title: string; url: string; descriptionJa?: string }> = {
  fact_jaipur_hawa_mahal_01: { publisher: "India Ministry of Tourism", title: "Discovering Hawa Mahal's Architectural Splendor", url: "https://www.incredibleindia.gov.in/en/rajasthan/jaipur/hawa-mahal" },
  fact_jaipur_hawa_mahal_02: { publisher: "India Ministry of Tourism", title: "Discovering Hawa Mahal's Architectural Splendor", url: "https://www.incredibleindia.gov.in/en/rajasthan/jaipur/hawa-mahal" },
  fact_jaipur_city_palace_01: { publisher: "The City Palace Museum Jaipur", title: "The City Palace Museum Jaipur", url: "https://citypalace.org/" },
  fact_jaipur_city_palace_02: { publisher: "Maharaja Sawai Man Singh II Museum Trust", title: "The City Palace Jaipur: Museum brochure", url: "https://citypalace.org/pdfs/Brochure.pdf", descriptionJa: "プリタム・ニワス中庭には、装飾を施した四つの門がある。この写真には写っていない。" },
};
const research = "authoring/journeys/golden_triangle/research/golden-triangle-20261103/source/data";
const output = "authoring/journeys/golden_triangle/drafts/observation-cards.json";
const facts: Fact[] = JSON.parse(await readFile(`${research}/TOURISM_FACTS.json`, "utf8"));
const sources: Source[] = JSON.parse(await readFile(`${research}/SOURCES.json`, "utf8"));
const factById = new Map(facts.map((fact) => [fact.id, fact]));
const sourceById = new Map(sources.map((source) => [source.id, source]));
if (factById.size !== facts.length || sourceById.size !== sources.length || new Set(selected.map(({ id }) => id)).size !== selected.length) throw new Error("Duplicate research or selected IDs");
const images: Record<string, { path: string; sha256: string }> = {};
const provenance: Record<string, { cityId: string; sourceFactId: string; reliability: string; needsFurtherResearch: boolean; visualEvidence: string | null }> = {};
const clues = await Promise.all(selected.map(async ({ id, region, visualEvidence }) => {
  const fact = factById.get(id);
  if (!fact || !fact.observationPotential || fact.classification === "hypothesis" || fact.classification === "legend") throw new Error(`Unusable research fact: ${id}`);
  const source = sourceById.get(fact.sourceId);
  if (!source || source.url !== fact.sourceUrl) throw new Error(`Missing or inconsistent source: ${id}`);
  if (Boolean(region) !== Boolean(visualEvidence)) throw new Error(`Missing visual evidence: ${id}`);
  const imagePath = `assets/tourism/india/${fact.placeId}.jpg`;
  images[fact.placeId] = { path: imagePath, sha256: createHash("sha256").update(await readFile(resolvePublicFile(process.cwd(), imagePath))).digest("hex") };
  const clueId = `gt_obs_${id}`;
  const supplement = followup[id];
  const descriptionJa = supplement?.descriptionJa ?? fact.summaryJa;
  provenance[clueId] = { cityId: fact.cityId, sourceFactId: id, reliability: fact.reliability, needsFurtherResearch: !fact.useWithoutFurtherResearch && !supplement, visualEvidence: visualEvidence ?? null };
  return tourismClueSchema.parse({ id: clueId, landmarkId: fact.placeId, kind: region ? "hotspot" : "document", titleJa: fact.titleJa,
    descriptionJa, factId: fact.id, relatedQuestionIds: [], region: region ?? null,
    sources: [{ publisher: supplement?.publisher ?? source.publisher, title: supplement?.title ?? source.title, url: supplement?.url ?? source.url, checkedAt: supplement ? "2026-11-03" : fact.checkedAt, claimType: fact.classification, claimJa: descriptionJa }] });
}));
// Promise completion order is deliberately not used for object serialization.
const orderedImages = Object.fromEntries(Object.entries(images).sort(([a], [b]) => a.localeCompare(b)));
const orderedProvenance = Object.fromEntries(Object.entries(provenance).sort(([a], [b]) => a.localeCompare(b)));
const result = JSON.stringify({ schemaVersion: 1, status: "authoring_only", images: orderedImages, provenance: orderedProvenance, clues }, null, 2) + "\n";
if (process.argv.includes("--write")) {
  await writeFile(output, result);
  console.log(`Wrote ${clues.length} observation cards for ${Object.keys(images).length} places to ${output}`);
} else if (process.argv.includes("--check")) {
  if (await readFile(output, "utf8") !== result) throw new Error(`Stale ${output}: research or image changed; recheck regions and regenerate deliberately`);
  console.log(`Verified ${clues.length} observation cards and ${Object.keys(images).length} image hashes`);
} else throw new Error("Use --write or --check");
