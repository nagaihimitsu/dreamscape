/**
 * journey-part-files.ts on the development server and in the unit tests (vite.config.ts resolves it to this file
 * there): every journey's part comes with the game, so Debug's scenes and the tests' states of any journey read their
 * content at once, as before the parts were split. A production build never uses this file.
 */
export const partLoaders: Record<string, () => Promise<unknown>> = import.meta.glob("./generated/journey-parts/*.json", { import: "default" });
export const bundledParts: Record<string, unknown> = import.meta.glob("./generated/journey-parts/*.json", { eager: true, import: "default" });
