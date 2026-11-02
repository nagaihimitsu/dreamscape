import { expect, test } from "@playwright/test";
import castle from "../fixtures/castle-clear-unplayed.json" with { type: "json" };
import { advanceToChoiceOrEnd, choose, loadSnapshot, saved, setDialogueSpeed, startEvent } from "./helpers";
import { installRomanceRolls, setRomanceRolls } from "./romance-rolls";

test.use({ reducedMotion: "reduce" });

test("the same stage and choice show the current relationship, and a reload keeps the chosen reaction", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 740 });
  // Tickets are fixed at date start; changing the test source before each
  // start exercises both results without rerolling a saved choice.
  await installRomanceRolls(page);
  await page.goto("/");
  const cases = [
    {
      stats: { affection: 0, trust: 0, spark: 0 },
      roll: 0,
      result: "positive",
      opening: "絵を見る人が動くまで、彼女は隣を一歩あけた。",
      reaction: "「次がある言い方だもんね。それなら、少し好きかも。」",
    },
    {
      stats: { affection: 6, trust: 4, spark: 4 },
      roll: 0,
      result: "positive",
      opening: "彼女は主人公の肩のすぐ横から、画面の端を指した。",
      reaction: "「次がある言い方だもんね。それなら、少し好きかも。」",
    },
    {
      stats: { affection: 1, trust: -2, spark: 0 },
      roll: 9999,
      result: "negative",
      opening: "絵を見る人が動くまで、彼女は隣を一歩あけた。",
      reaction: "「本当は続いてほしいときほど、軽く聞こえちゃう気がする。」",
    },
    {
      stats: { affection: 0, trust: 1, spark: 4 },
      roll: 9999,
      result: "negative",
      opening: undefined,
      reaction: "「本当は続いてほしいときほど、軽く聞こえちゃう気がする。」",
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
    await setRomanceRolls(page, [scenario.roll, 0, 0, 0]);
    await startEvent(page, "milano_brera_date_01", 2);
    await setDialogueSpeed(page, "0");
    const observed: string[] = [];
    const ready = await advanceToChoiceOrEnd(page, observed);
    expect(ready.romanceStage).toBe(2);
    if (scenario.opening) expect(observed).toContain(scenario.opening);
    expect(ready.activeDate?.frame.choices[2].text).toBe("「じゃあね、にも続きがあるよ」");
    await choose(page, 2);
    const after = await saved(page);
    expect(after.activeDate?.randomPlan[0].reaction).toBe(scenario.roll);
    expect(after.activeDate?.resolvedChoices[0].result).toBe(scenario.result);
    expect(after.activeDate?.frame.text).toBe(scenario.reaction);
    reactions.push(after.activeDate!.frame.text);
    await page.reload();
    expect(await saved(page)).toEqual(after);
    await expect(page.getByTestId("romance-scene")).toContainText(scenario.reaction);
  }
  expect(new Set(reactions).size).toBe(2);
});
