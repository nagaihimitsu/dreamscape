/**
 * The journeys' parts of the content (src/content/generated/journey-parts/, read by src/content/index.ts). In a
 * production build each one is a file of its own, loaded when its journey opens (loadJourneyContent); none comes with
 * the game. The development server and the unit tests use journey-part-files.all.ts instead (vite.config.ts), which
 * brings every part with the game.
 */
export const partLoaders: Record<string, () => Promise<unknown>> = import.meta.glob("./generated/journey-parts/*.json", { import: "default" });
/** The parts that come with the game: none in a production build. */
export const bundledParts: Record<string, unknown> = {};
