import { expect, test } from "@playwright/test";
import castle from "../fixtures/castle-clear-unplayed.json" with { type: "json" };
import { advanceToChoiceOrEnd, choose, loadSnapshot, saved, setDialogueSpeed, startEvent } from "./helpers";

test.use({ reducedMotion: "reduce" });

test("the same stage and choice show the current relationship, and a reload keeps the chosen reaction", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  // The production adapter still saves all tickets at date start. A fixed
  // source here makes both players receive the same positive random result.
  await page.addInitScript(() => {
    Object.defineProperty(globalThis.crypto, "getRandomValues", {
      value: (array: Uint32Array) => { array.fill(0); return array; },
    });
  });
  await page.goto("/");
  const cases = [
    {
      stats: { affection: 0, trust: 0, spark: 0 },
      opening: "彼女は絵の足元を見ながら、こちらのほうへ少し体を向けた。",
      reaction: "「……そう見えますか」",
    },
    {
      stats: { affection: 6, trust: 4, spark: 4 },
      opening: "彼女は絵からこちらに目を向け、言いかけてから少し笑った。",
      reaction: "「……そこ、私も気になってました」",
    },
  ];
  const reactions: string[] = [];
  for (const scenario of cases) {
    const snapshot = await page.evaluate(async ({ fixture, stats }) => {
      const modulePath = "/src/domain/game.ts";
      const domain = await import(/* @vite-ignore */ modulePath);
      const base = domain.validateGameState(fixture);
      return domain.validateGameState({ ...base, ...stats, romanceStage: 2 });
    }, { fixture: castle, stats: scenario.stats });
    await loadSnapshot(page, snapshot);
    await startEvent(page, "milano_brera_date_01", 2);
    await setDialogueSpeed(page, "0");
    const observed: string[] = [];
    const ready = await advanceToChoiceOrEnd(page, observed);
    expect(ready.romanceStage).toBe(2);
    expect(observed).toContain(scenario.opening);
    await choose(page, 2);
    const after = await saved(page);
    expect(after.activeDate?.resolvedChoices[0].result).toBe("positive");
    expect(after.activeDate?.frame.text).toBe(scenario.reaction);
    reactions.push(after.activeDate!.frame.text);
    await page.reload();
    expect(await saved(page)).toEqual(after);
    await expect(page.getByTestId("romance-scene")).toContainText(scenario.reaction);
  }
  expect(reactions[0]).not.toBe(reactions[1]);
});
