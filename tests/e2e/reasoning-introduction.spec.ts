import { expect, test, type Page } from "@playwright/test";
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import { loadSnapshot, saved } from "./helpers";
import { answerRound, battleDialogueUntilQuestionOrResult } from "./battle-helpers";
import { specialBattle, startSpecialFromEntry } from "./reasoning-helpers";

/** Use the actual battle transition rather than inventing an in-progress save. */
async function reachReasoningFromClaim(page: Page, format: "B" | "C") {
  const prior = format === "B" ? phase6.B_result : phase6.C_result;
  await loadSnapshot(page, {
    ...phase6.freeTime,
    battleRecords: [...phase6.freeTime.battleRecords, ...prior.battleRecords],
  });
  await startSpecialFromEntry(page, format);
  const { quiz, reasoning } = specialBattle(format);
  for (let i = 0; i < reasoning.roundIndex; i++) {
    await battleDialogueUntilQuestionOrResult(page);
    await answerRound(page, quiz.questions[i], true);
    await page.getByTestId("battle-advance").click();
  }
  const transcript: string[] = [];
  for (let count = 0; count < 80; count++) {
    const state = await saved(page);
    if (state.activeBattle?.phase === "reasoning") {
      expect(transcript.join("\n")).toContain(format === "B" ? "中央の下部まで、例外はない" : "二つの資料");
      return state;
    }
    expect(state.activeBattle?.phase).toBe("dialogue");
    transcript.push(state.activeBattle!.frame!.text);
    await page.getByTestId("battle-advance").click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(state.revision);
  }
  throw new Error("Special battle did not reach its claim");
}

/** The introductory dialogue is presentation only and must not mutate the save. */
async function finishRebuttal(page: Page, original: Awaited<ReturnType<typeof saved>>) {
  const rebuttal = page.getByTestId("reasoning-rebuttal");
  await expect(rebuttal).toBeVisible();
  const lines: string[] = [];
  for (let i = 0; i < 10 && await rebuttal.isVisible(); i++) {
    const advance = page.getByTestId("reasoning-rebuttal-advance");
    await expect(advance).toBeEnabled();
    lines.push((await rebuttal.textContent()) ?? "");
    await advance.click();
    expect(await saved(page)).toEqual(original);
  }
  expect(lines.length).toBeGreaterThanOrEqual(1);
  expect(lines.join("\n")).not.toContain("食卓の下に残る切れ目");
  return lines.join("\n");
}

for (const example of [
  { format: "B", title: "矛盾追及！", explanation: "主張と矛盾する証拠を1枚突きつけろ！", heading: "矛盾追及", count: "0 / 1" },
  { format: "C", title: "証拠連結！", explanation: "2つの証拠を組み合わせよ！", heading: "証拠連結", count: "0 / 2" },
] as const) {
  test(`${example.format}: claim → heroine's response → skippable cut-in → evidence`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 360, height: 780 });
    const state = await reachReasoningFromClaim(page, example.format);
    await expect(page.locator(".battle-nameplate")).toContainText(state.heroineName);
    const text = await finishRebuttal(page, state);
    expect(text).not.toContain("中央への注意を高め");
    const cutin = page.getByTestId("reasoning-cutin");
    await expect(cutin).toBeVisible();
    await expect(cutin).toContainText(example.title);
    await expect(cutin).toContainText(example.explanation);
    await page.getByTestId("reasoning-cutin-skip").click();
    await expect(cutin).toHaveCount(0);
    expect(await saved(page)).toEqual(state);
    const panel = page.getByTestId("reasoning-panel");
    await expect(panel).toContainText(example.heading);
    await expect(panel).toContainText(example.count);
    await expect(page.getByTestId("reasoning-submit")).toBeDisabled();
    await page.getByTestId("reasoning-notebook").click();
    await expect(page.getByRole("dialog", { name: "手がかり帳" })).toBeVisible();
    await page.getByTestId("case-return").click();
    expect(await saved(page)).toEqual(state);
    await page.reload();
    await expect(page.getByTestId("reasoning-cutin")).toHaveCount(0);
    await expect(page.getByTestId("reasoning-rebuttal")).toHaveCount(0);
    expect(await saved(page)).toEqual(state);
  });
}

for (const example of [
  { name: "B before selection", snapshot: phase6.B_reasoning },
  { name: "B during questioning", snapshot: phase6.B_press },
  { name: "B with selected evidence", snapshot: phase6.B_selected },
  { name: "B after submission", snapshot: phase6.B_accepted },
  { name: "C before selection", snapshot: phase6.C_reasoning },
  { name: "C with a selected card", snapshot: phase6.C_selected },
  { name: "C after submission", snapshot: phase6.C_accepted },
  { name: "ordinary A question", snapshot: phase6.battleQuestion },
] as const) {
  test(`${example.name}: an existing in-progress save is restored without replaying the introduction`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await loadSnapshot(page, example.snapshot);
    await expect(page.getByTestId("reasoning-cutin")).toHaveCount(0);
    await expect(page.getByTestId("reasoning-rebuttal")).toHaveCount(0);
    expect(await saved(page)).toEqual(example.snapshot);
    await page.reload();
    await expect(page.getByTestId("reasoning-cutin")).toHaveCount(0);
    await expect(page.getByTestId("reasoning-rebuttal")).toHaveCount(0);
    expect(await saved(page)).toEqual(example.snapshot);
  });
}

test("reloading during a cut-in does not replay it or change the saved reasoning", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 780 });
  const state = await reachReasoningFromClaim(page, "B");
  await finishRebuttal(page, state);
  await expect(page.getByTestId("reasoning-cutin")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("reasoning-cutin")).toHaveCount(0);
  await expect(page.getByTestId("reasoning-rebuttal")).toHaveCount(0);
  await expect(page.getByTestId("reasoning-panel")).toBeVisible();
  expect(await saved(page)).toEqual(state);
});

test("reduced motion leaves the evidence panel usable after the introduction", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const state = await reachReasoningFromClaim(page, "B");
  await finishRebuttal(page, state);
  const cutin = page.getByTestId("reasoning-cutin");
  await expect(cutin).toBeVisible();
  await expect(cutin.locator(".reasoning-cutin-impact")).toHaveCSS("animation-name", "none");
  await expect(cutin).toHaveCount(0, { timeout: 5000 });
  await expect(page.getByTestId("reasoning-notebook")).toBeVisible();
  expect(await saved(page)).toEqual(state);
});

test("loading from the in-game controls dismisses an in-progress cut-in", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 780 });
  const state = await reachReasoningFromClaim(page, "B");
  await finishRebuttal(page, state);
  await expect(page.getByTestId("reasoning-cutin")).toBeVisible();
  await page.getByRole("button", { name: "ロード", exact: true }).click();
  await expect(page.getByTestId("reasoning-cutin")).toHaveCount(0);
  await expect(page.getByTestId("reasoning-rebuttal")).toHaveCount(0);
  await expect(page.getByTestId("reasoning-panel")).toBeVisible();
  expect(await saved(page)).toEqual(state);
});
