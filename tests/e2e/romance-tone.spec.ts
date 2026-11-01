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
      opening: "彼女は自分の靴を見下ろし、絵を見直した。",
      reaction: "「離れたくない、か。もう一度見てみよう」",
    },
    {
      stats: { affection: 6, trust: 4, spark: 4 },
      roll: 0,
      result: "positive",
      opening: "彼女は一瞬こちらを見てから、わざとらしく靴へ目を戻した。",
      reaction: "「……そこ、わたしも気になってた」",
    },
    {
      stats: { affection: 1, trust: -2, spark: 0 },
      roll: 9999,
      result: "negative",
      opening: "彼女は絵との距離を取ってから、こちらに尋ねた。",
      reaction: "「絵の話だよね。今は、そのまま絵を見ていたいな」",
    },
    {
      stats: { affection: 0, trust: 1, spark: 4 },
      roll: 9999,
      result: "negative",
      opening: "目が合うと彼女は一度絵へ戻り、それから小さく笑った。",
      reaction: "「そこを見るんだ。……絵の話、だよね？」",
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
    expect(observed).toContain(scenario.opening);
    expect(ready.activeDate?.frame.choices[2].text).toBe("「二人の間。離れたくなさそうに見えた」");
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
  expect(new Set(reactions).size).toBe(cases.length);
});
