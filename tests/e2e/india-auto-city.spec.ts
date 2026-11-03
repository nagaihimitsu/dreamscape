import { expect, test } from "@playwright/test";
import { advanceDialogue, setDialogueSpeed } from "./helpers";

// Temporary Milan-derived fixture scenes and an isolated memory save exercise
// the real App flow. They are not India's finished story or player saves.
test("a finished India city resumes its epilogue and advances automatically", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/?debug");
  const original = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.evaluate(async () => {
    const fixturePath = "/src/domain/multi-city-test-fixture.ts";
    const debugPath = "/src/dev/debug-state.ts";
    const battlePath = "/src/domain/battle.ts";
    const persistencePath = "/src/persistence/index.ts";
    const reactPath = "/node_modules/.vite/deps/react.js";
    const domPath = "/node_modules/.vite/deps/react-dom_client.js";
    const appPath = "/src/app/App.tsx";
    const { installIndiaTestCities } = await import(/* @vite-ignore */ fixturePath);
    const { createDebugState } = await import(/* @vite-ignore */ debugPath);
    const battle = await import(/* @vite-ignore */ battlePath);
    const { saveGame } = await import(/* @vite-ignore */ persistencePath);
    const { default: React } = await import(/* @vite-ignore */ reactPath);
    const { default: { createRoot } } = await import(/* @vite-ignore */ domPath);
    const { default: App } = await import(/* @vite-ignore */ appPath);
    installIndiaTestCities();
    let state = createDebugState({ cityId: "delhi", scene: "battle", id: "delhi_final_battle",
      progress: "completed", ap: 6, affection: 3, trust: 2, spark: 1, roll: "positive" });
    for (let step = 0; state.activeBattle?.phase !== "result"; step++) {
      if (!state.activeBattle || step > 250) throw new Error("Fixture finale did not reach its result");
      const active = state.activeBattle;
      const { quiz } = battle.getActiveBattleContent(active);
      state = active.phase === "question"
        ? battle.answerBattle(state, quiz.questions[active.roundIndex].correctOptionId, state.revision)
        : battle.advanceBattle(state, state.revision);
    }
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); } };
    if (!saveGame(storage, state).ok) throw new Error("Could not save isolated fixture");
    const host = document.createElement("div");
    document.getElementById("root")!.style.display = "none";
    document.body.append(host);
    let root = createRoot(host);
    const render = () => root.render(React.createElement(App, { storage, debug: true, nextRomanceRoll: () => 0 }));
    render();
    (window as unknown as { indiaAutoTest: unknown }).indiaAutoTest = {
      initial: structuredClone(state),
      read: () => JSON.parse(storage.getItem("dreamscape.save.v1")!),
      remount: () => { root.unmount(); root = createRoot(host); render(); },
    };
  });
  const read = () => page.evaluate(() => (window as unknown as { indiaAutoTest: { read: () => Record<string, unknown> } }).indiaAutoTest.read());
  await expect(page.getByTestId("battle-result")).toBeVisible();
  await expect(page.getByRole("button", { name: /へ出発/ })).toHaveCount(0);
  const initial = await read();
  await setDialogueSpeed(page, "0");
  await page.getByRole("button", { name: /自由時間へ進む/ }).click();
  await expect(page.getByTestId("city-epilogue-screen")).toBeVisible();
  const duringEpilogue = await read();
  expect(duringEpilogue.currentCityId).toBe("delhi");
  expect(duringEpilogue.activeEpilogue).not.toBeNull();
  await page.evaluate(() => (window as unknown as { indiaAutoTest: { remount: () => void } }).indiaAutoTest.remount());
  await expect(page.getByTestId("city-epilogue-screen")).toBeVisible();
  expect(await read()).toEqual(duringEpilogue);
  for (let step = 0; step < 50 && await page.getByTestId("city-epilogue-screen").isVisible(); step++) {
    await advanceDialogue(page, "epilogue-advance");
  }
  await expect(page.getByTestId("city-epilogue-screen")).toHaveCount(0);
  await expect(page.getByTestId("travel-menu")).toHaveAttribute("aria-label", "アーグラ（仮データ）の行き先");
  const after = await read();
  expect(after.currentCityId).toBe("agra");
  expect(after.viewedEpilogueCityIds).toContain("delhi");
  expect(after.travel).toMatchObject({ currentPlaceId: "agra_hotel", hotelPlaceId: "agra_hotel", day: 1, minute: 540 });
  for (const key of ["playerName", "heroineName", "ap", "pendingApRewards", "travelBudget", "affection", "trust", "spark", "memories", "claimedRewardIds", "completedCityIds", "battleRecords", "playedDateIds"])
    expect(after[key], key).toEqual(initial[key]);
  await expect(page.getByRole("button", { name: /へ出発/ })).toHaveCount(0);
  await page.evaluate(() => (window as unknown as { indiaAutoTest: { remount: () => void } }).indiaAutoTest.remount());
  await expect(page.getByTestId("travel-menu")).toHaveAttribute("aria-label", "アーグラ（仮データ）の行き先");
  expect(await read()).toEqual(after);
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(original);
});
