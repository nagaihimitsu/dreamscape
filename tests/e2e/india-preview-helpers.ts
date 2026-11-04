import type { Page } from "@playwright/test";

/** Keep exercising the isolated transport preview after India becomes playable.
 * Only this browser page's city-status flag changes; routes, prices and saves
 * are the actual registered data. A reload restores the production registry.
 */
export async function installIndiaTransportPreview(page: Page) {
  await page.evaluate(async () => {
    // Vite can retain a timestamped module URL after content regeneration.
    // Mutate the registry actually used by this page, not a second module copy.
    const path = performance.getEntriesByType("resource").map((entry) => entry.name)
      .filter((url) => new URL(url).pathname === "/src/content/index.ts").at(-1);
    if (!path) throw new Error("The page's city registry has not loaded.");
    const { getCityContent } = await import(/* @vite-ignore */ path);
    for (const cityId of ["delhi", "agra", "jaipur"])
      getCityContent(cityId).city.productionStatus = "prototype";
  });
}

/** Create the real independent India slot without switching the active Milan UI. */
export async function saveIndependentIndiaGame(page: Page) {
  return page.evaluate(async () => {
    const gamePath = "/src/domain/game.ts";
    const persistencePath = "/src/persistence/index.ts";
    const storagePath = "/src/persistence/journey-storage.ts";
    const { createGame } = await import(/* @vite-ignore */ gamePath);
    const { saveGame } = await import(/* @vite-ignore */ persistencePath);
    const { journeyStorage } = await import(/* @vite-ignore */ storagePath);
    return saveGame(journeyStorage(localStorage, "golden_triangle"),
      createGame("インドの主人公", "インドの相手", { journeyId: "golden_triangle" }));
  });
}
