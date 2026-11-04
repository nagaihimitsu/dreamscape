import { expect, type Page } from "@playwright/test";
import type { GameState } from "../../src/domain/game";
import { advanceDialogue } from "./helpers";

export const indiaSaveKey = "dreamscape.journey.golden_triangle.save.v1";
export const readIndiaState = (page: Page): Promise<GameState> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), indiaSaveKey);

/** Read the saved, effect-free welcome through the same controls as a player. */
export async function finishCityArrival(page: Page, onConversation?: () => Promise<void>) {
  const before = await readIndiaState(page);
  expect(before.activeEpilogue?.kind).toBe("arrival");
  await expect.poll(async () => (await readIndiaState(page)).activeEpilogue?.logoComplete).toBe(true);
  await expect(page.getByTestId("arrival-logo")).toHaveCount(0);
  await expect(page.locator(".dialogue-text").first()).toBeInViewport({ ratio: 0.5 });
  if (onConversation) await onConversation();
  for (let line = 0; (await readIndiaState(page)).activeEpilogue?.kind === "arrival"; line++) {
    expect(line).toBeLessThan(15);
    const current = await readIndiaState(page);
    expect(current.activeEpilogue!.frame.speaker).not.toBe("player");
    expect(current.activeEpilogue!.frame.choices).toHaveLength(0);
    await advanceDialogue(page, "arrival-advance");
    await expect.poll(async () => (await readIndiaState(page)).revision).toBeGreaterThan(current.revision);
  }
  const after = await readIndiaState(page);
  // Only the saved scene and revision may change; even time and history stay put.
  const { revision: oldRevision, activeEpilogue: oldScene, ...oldValues } = before;
  const { revision: newRevision, activeEpilogue: newScene, ...newValues } = after;
  void oldRevision; void oldScene; void newRevision;
  expect(newScene).toBeNull();
  expect(newValues).toEqual(oldValues);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
}
