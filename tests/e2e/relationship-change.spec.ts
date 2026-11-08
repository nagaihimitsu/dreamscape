import { describeRelationshipChange, relationshipChange } from "../../src/domain/relationship-change";
import { expect, ops, placeDateSave, playUntil, readSave, test, tier, type Page } from "./helpers";

// User decision 2026-11-08 ②: while Debug mode is on, a choice's relationship changes show above the
// scene; the display is for authors, never story text, never in the message log or the save
// (AGENTS.md 関係状態はプレイヤーには表示しない…Debugモードがオンの間だけ). Lane 2 (docs/10): a normal
// save of a started date is placed with the real game functions, then everything goes through the UI.
// In the debug tier (not the gate, whose count is already over its budget, docs/10): it needs the dev server.

// A long flow (docs/10「不安定さと時間の決まり」): two page loads, a whole date, 設定 twice and a load.
test.describe.configure({ timeout: 120_000 });

const strip = (page: Page) => page.getByTestId("relationship-change");
const shownLines = (page: Page) => strip(page).locator("p").allTextContents();

/** Choose the first reply; returns the saved states before and after it. */
async function reply(page: Page) {
  const before = await playUntil(page, (state) => !!state.activeDate?.frame.choices.length);
  await page.getByTestId("date-choice").first().click();
  await expect.poll(async () => (await readSave(page)).revision).toBe(before.revision + 1);
  return { before, after: await readSave(page) };
}

test("with Debug mode on, a date reply's relationship change shows above the scene, never in the log, and goes with a load or the switch", { tag: tier.debug }, async ({ page }) => {
  await page.goto("/");
  await placeDateSave(page);
  await page.reload();
  await expect(page.getByTestId("romance-scene")).toBeVisible();
  await ops.turnOnDebugMode(page);

  // The first reply: the strip shows exactly the change of the saved states.
  const first = await reply(page);
  const change = relationshipChange(first.before, first.after);
  // Ticket 0 makes the reaction positive, and every positive range starts at +1: a value changed.
  expect(change?.axes.length).toBeGreaterThan(0);
  await expect(strip(page)).toBeVisible();
  expect(await shownLines(page)).toEqual(describeRelationshipChange(change!));
  await expect(strip(page)).toContainText(/反応：噛み合った（噛み合う確率 \d+%）/u);

  // Not in the message log: none of its lines, no before→after values, no reaction, no Debug mark.
  const log = await ops.openDialogueLog(page);
  const logText = await log.innerText();
  for (const line of describeRelationshipChange(change!)) expect(logText).not.toContain(line);
  expect(logText).not.toMatch(/（−?\d+→−?\d+）|反応：|Debug/u);
  await ops.closeDialog(log);
  await expect(strip(page)).toBeVisible();

  // A load brings back the same date run: the earlier change is not shown again.
  await ops.load(page);
  await expect(page.getByTestId("romance-scene")).toBeVisible();
  await expect(strip(page)).toHaveCount(0);

  // The next reply shows its own change; turning Debug mode off removes it at once.
  const second = await reply(page);
  expect(await shownLines(page)).toEqual(describeRelationshipChange(relationshipChange(second.before, second.after)!));
  await ops.turnOffDebugMode(page);
  await expect(strip(page)).toHaveCount(0);

  // The date ends without a strip, and the free time shows none.
  const finished = await playUntil(page, (state) => !state.activeDate);
  expect(finished.playedDateIds.length).toBeGreaterThan(0);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  await expect(strip(page)).toHaveCount(0);
});
