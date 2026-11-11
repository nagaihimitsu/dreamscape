import { readFileSync } from "node:fs";
import path from "node:path";
import { generatedScenesSchema } from "../src/content/scene-schemas";
import { albumImageListSchema } from "../src/content/album-images";
import { journeyReadthrough } from "./journey-readthrough";

// npm run journey:readthrough -- --journey <journeyId> [--max-paths N]: the order table of every landmark
// visit and every scene's lines path by path, from the last content:build (src/content/generated/).
// A reading aid for the script review (the unified event design, stage 3a); it checks nothing.
const args = process.argv.slice(2);
const journeyIndex = args.indexOf("--journey");
const journeyId = journeyIndex >= 0 ? args[journeyIndex + 1] : undefined;
const maxIndex = args.indexOf("--max-paths");
const maxPaths = maxIndex >= 0 ? Number(args[maxIndex + 1]) : 12;
if (!journeyId || !Number.isInteger(maxPaths) || maxPaths < 1)
  throw new Error("Usage: npm run journey:readthrough -- --journey <journeyId> [--max-paths N] (after npm run content:build; the sample: -- --with-sample)");
const generated = path.join(process.cwd(), "src/content/generated");
const read = (file: string) => JSON.parse(readFileSync(path.join(generated, file), "utf8"));
const journey = (read("content/journeys/catalog.json") as { journeys: { id: string; cities: { id: string }[] }[] }).journeys.find((item) => item.id === journeyId);
if (!journey) throw new Error(`Unknown journey in the last content:build: ${journeyId}`);
const presentation = read("content/romance/presentation.json") as { backgrounds: Record<string, { imageAssetId?: string }>; emotions: Record<string, unknown> };
// The map events by place: the landmark a visit opens (an episode's or a special battle's), a date, a city's finale.
const progressionJson = read("content/progression/journey.json") as { episodes: { id: string; kind: string; cityId: string; landmarkId: string | null }[] };
const battleJson = read("content/battles/catalog.json") as { battles: { id: string; landmarkId?: string | null }[] };
const dateJson = read("content/romance/date_catalog.json") as { dates: { id: string }[] };
const events = journey.cities.flatMap((city) => (read(`content/travel/${city.id}.json`) as { events: { id: string; placeId: string }[] }).events.map((event) => {
  const episode = progressionJson.episodes.find((item) => item.id === event.id);
  const landmarkId = episode?.kind === "episode" ? episode.landmarkId : battleJson.battles.find((item) => item.id === event.id)?.landmarkId;
  return { placeId: event.placeId, ...(landmarkId ? { landmarkId } : {}), ...(dateJson.dates.some((item) => item.id === event.id) ? { dateId: event.id } : {}),
    ...(episode?.kind === "city_finale" ? { finaleCityId: episode.cityId } : {}) };
}));
const tourism = read("content/tourism/catalog.json") as {
  landmarks: { id: string; cityId: string; nameJa: string; guideStoryId?: string; battleId: string }[];
};
const lines = journeyReadthrough({
  scenes: generatedScenesSchema.parse(read("scenes.json")).scenes,
  stories: read("stories.json"),
  landmarks: tourism.landmarks,
  cityIds: journey.cities.map((city) => city.id),
  events,
  context: { effectIds: (read("content/romance/effect_catalog.json") as { effects: { id: string }[] }).effects.map((effect) => effect.id),
    backgroundIds: Object.keys(presentation.backgrounds), emotionIds: Object.keys(presentation.emotions),
    // The album images of this journey (its public/assets/album/; generated/album-images.json).
    photoIds: albumImageListSchema.parse(read("album-images.json")).filter((image) => image.journeyId === journeyId).map((image) => image.id) },
  maxPaths,
});
console.log(lines.join("\n"));
