import type { GameState } from "../../src/domain/game";
import { DEBUG_HOOK_NAME, type DreamscapeDebugHook } from "../../src/dev/debug-hook";
import { debugQueryString, type DebugSettings } from "../../src/dev/debug-query";
import { test as base, bothStorages, debugGame, devModules, expect, ops, placeSave, playUntil, tier, type Page } from "./helpers";

// Lane 3 (docs/10「Debugを場面の起動台にする」): Debug opens scenes that the real
// flow reaches only after many steps. These tests check that a scene can be played
// through and left; they never count as save/resume checks (AGENTS.md: Debugを通常の
// 保存・再開確認の代わりにしない). Development server only.
// Every test starts next to a normal saved game and ends with both browser storages
// exactly as before (docs/07 acceptance 14: Debug never changes the player's data).
const test = base.extend<{ normalStorageUnchanged: void }>({
  normalStorageUnchanged: [async ({ page }, use) => {
    await page.goto("/");
    await placeSave(page, "milano", "newJourney", "milano", ["航", "澪"]);
    const before = await bothStorages(page);
    await use();
    expect(await bothStorages(page), "Debug changed the normal browser storage").toEqual(before);
  }, { auto: true }],
});

const settings = (input: Pick<DebugSettings, "cityId" | "scene" | "id"> & Partial<DebugSettings>): DebugSettings =>
  ({ progress: "completed", ap: 12, affection: 0, trust: 0, spark: 0, roll: "positive", ...input });

type SpecialBattle = { cityId: string; battleId: string; correctClueIds: string[] };

/** The first special battle of each kind that Debug lists, read from the dev server's content (no fixed IDs). */
function specialBattles(page: Page): Promise<Partial<Record<"contradiction" | "connection", SpecialBattle>>> {
  return page.evaluate(async (modules) => {
    const { battles, getCities } = await import(/* @vite-ignore */ modules.content);
    const { debugTargets } = await import(/* @vite-ignore */ modules.debugState);
    const found: Record<string, SpecialBattle> = {};
    for (const city of getCities().filter((item: { productionStatus?: string }) => item.productionStatus !== "prototype")) {
      const listed = new Set(debugTargets(city.id).battle.map((target: { id: string }) => target.id));
      for (const battle of battles)
        if (battle.reasoning && listed.has(battle.id) && !found[battle.reasoning.kind])
          found[battle.reasoning.kind] = { cityId: city.id, battleId: battle.id, correctClueIds: battle.reasoning.correctClueIds };
    }
    return found;
  }, devModules);
}

/** After the claim, the optional rebuttal lines and the cut-in are presentation only (never saved). */
async function passReasoningIntro(page: Page) {
  const notebook = page.getByTestId("reasoning-notebook");
  const line = page.getByTestId("dialogue-text");
  const rebuttal = page.getByTestId("reasoning-rebuttal-advance");
  const skip = page.getByTestId("reasoning-cutin-skip");
  for (let step = 0; step < 50 && !(await notebook.isVisible()); step++) {
    await expect(notebook.or(skip).or(rebuttal).or(line).first()).toBeVisible();
    if (await skip.isVisible()) await skip.click();
    else if (await rebuttal.isVisible()) await rebuttal.click();
    else if (await line.isVisible()) await line.click();
  }
  await expect(notebook).toBeVisible();
}

for (const [kind, label] of [["contradiction", "B（矛盾追及）"], ["connection", "C（証拠連結）"]] as const) {
  // docs/07 「将来のテスト」: B/C特殊戦で証拠メモを開閉しても回答状態保持. Special battles lead to
  // the city finale, so an evidence screen that does not accept the right evidence stops every player.
  test(`special battle ${label}: the evidence chosen in the clue book stays chosen, is accepted and leads to the result`, { tag: tier.debug }, async ({ page }) => {
    const special = (await specialBattles(page))[kind];
    expect(special, `a ${kind} special battle that Debug lists`).toBeDefined();
    await ops.openDebugScene(page, settings({ cityId: special!.cityId, scene: "battle", id: special!.battleId }));
    await playUntil(page, (state) => state.activeBattle?.phase === "reasoning", { source: debugGame });
    await passReasoningIntro(page);

    for (const clueId of special!.correctClueIds) {
      await page.getByTestId("reasoning-notebook").click();
      await page.getByTestId("clue-picker").selectOption(clueId);
      await page.getByTestId(`select-evidence-${clueId}`).click();
      await expect(page.getByTestId(`select-evidence-${clueId}`)).toContainText("選択中");
      await page.getByTestId("case-return").click();
    }
    const count = special!.correctClueIds.length;
    await expect(page.getByTestId("selected-evidence")).toContainText(`選んだ証拠 ${count} / ${count}枚`);
    const chosen = (await debugGame(page))!.activeBattle!.reasoning!.selectedClueIds;
    expect([...chosen].sort()).toEqual([...special!.correctClueIds].sort());
    // Opening and closing the clue book again keeps the choice.
    await page.getByTestId("reasoning-notebook").click();
    for (const clueId of special!.correctClueIds)
      await expect(page.getByTestId("clue-picker").locator(`option[value="${clueId}"]`)).toContainText("（選択中）");
    await page.getByTestId("cluebook-close").click();
    expect((await debugGame(page))!.activeBattle!.reasoning!.selectedClueIds).toEqual(chosen);

    await page.getByTestId("reasoning-submit").click();
    const result = await playUntil(page, (state) => state.activeBattle?.phase === "result", { source: debugGame });
    expect(result.activeBattle!.reasoning).toMatchObject({ submittedClueIds: chosen });
    await expect(page.getByTestId("battle-result")).toBeVisible();
    await ops.backToDebugSettings(page);
  });
}

type ItemEncounter = { cityId: string; encounterId: string; itemId: string; itemName: string; correctOptionId?: string };

/** The first encounter Debug can open that gives an item, from the dev server's content. */
function itemEncounter(page: Page): Promise<ItemEncounter | undefined> {
  return page.evaluate(async (modules) => {
    const { getCities } = await import(/* @vite-ignore */ modules.content);
    const { encounters } = await import(/* @vite-ignore */ modules.encounters);
    const { debugTargets } = await import(/* @vite-ignore */ modules.debugState);
    for (const city of getCities().filter((item: { productionStatus?: string }) => item.productionStatus !== "prototype"))
      for (const target of debugTargets(city.id).encounter.filter((item: { unavailable?: string }) => !item.unavailable)) {
        const encounter = encounters.encounters.find((item: { id: string }) => item.id === target.id);
        const itemId = encounter.quiz?.rewardItemId ?? encounter.completionItemId;
        const itemName = encounters.items.find((item: { id: string }) => item.id === itemId)?.nameJa;
        if (itemId) return { cityId: city.id, encounterId: encounter.id, itemId, itemName, correctOptionId: encounter.quiz?.question.correctOptionId };
      }
    return undefined;
  }, devModules);
}

// AGENTS.md 「英語は…道中交流で主人公の返答・行動を選ぶ3択に用いる」「道中の品物は所属都市を登録し…」.
test("an encounter answered in English gives its item, and the scene ends back at the place", { tag: tier.debug }, async ({ page }) => {
  const encounter = await itemEncounter(page);
  expect(encounter, "an encounter with an item that Debug can open").toBeDefined();
  // A won reward needs the saved ticket below its chance: the positive ticket (0) always wins.
  await ops.openDebugScene(page, settings({ cityId: encounter!.cityId, scene: "encounter", id: encounter!.encounterId, roll: "positive" }));
  await expect(page.getByTestId("encounter-screen")).toBeVisible();
  const pick = (state: GameState) => state.activeEncounter?.phase === "quiz" ? encounter!.correctOptionId! : "A";
  const done = await playUntil(page, (state) => state.completedEncounterIds.includes(encounter!.encounterId), { source: debugGame, pick });
  expect(done.inventory[encounter!.itemId]).toBe("held");
  // The header lists it among the items held in this city.
  await expect(page.getByRole("group", { name: "所持アイテム" }).getByRole("button", { name: `${encounter!.itemName}の詳細` })).toBeVisible();
  // Encounters waiting at the same place may follow; the scene ends back at the place or the travel menu.
  await playUntil(page, (state) => !state.activeEncounter, { source: debugGame, pick });
  await expect(page.getByTestId("observation-viewport").or(page.getByTestId("travel-menu"))).toBeVisible();
  await ops.backToDebugSettings(page);
});

// docs/07 acceptance 3, 4 and AGENTS.md 「恋愛の選択は固定正解とせず…保存済み乱数によって…変わる」:
// with the most favourable (0) and the least favourable (9999) saved ticket, a date plays to its end.
for (const roll of ["positive", "negative"] as const) {
  test(`a date with the ${roll} reaction ticket plays to its end`, { tag: tier.debug }, async ({ page }) => {
    const date = await page.evaluate(async (modules) => {
      const { debugTargets, defaultDebugCityId } = await import(/* @vite-ignore */ modules.debugState);
      return { cityId: defaultDebugCityId as string, dateId: debugTargets(defaultDebugCityId).date[0]?.id as string | undefined };
    }, devModules);
    expect(date.dateId, "a date of Debug's default city").toBeDefined();
    await ops.openDebugScene(page, settings({ cityId: date.cityId, scene: "date", id: date.dateId!, ap: 6, roll }));
    await expect(page.getByTestId("romance-scene")).toBeVisible();
    const opened = (await debugGame(page))!;
    expect(opened.activeDate?.dateId).toBe(date.dateId);
    const finished = await playUntil(page, (state) => !state.activeDate, { source: debugGame });
    expect(finished.playedDateIds).toContain(date.dateId);
    expect(finished.ap).toBe(opened.ap);
    await expect(page.getByTestId("travel-menu")).toBeVisible();
    await ops.backToDebugSettings(page);
  });
}

test("a Debug launch URL opens its scene, offers the same URL and explains a URL that does not fit", { tag: tier.debug }, async ({ page }) => {
  const url = debugQueryString({ dataMode: "real", cityId: "milano", scene: "date", target: "milano_brera_date_01",
    progress: "completed", ap: 9, affection: 0, trust: 0, spark: 0, roll: "negative" });
  await page.goto(`/${url}`);
  await expect(page.getByTestId("debug-session")).toBeVisible();
  await expect(page.getByTestId("romance-scene")).toBeVisible();
  // The development-only, read-only hook shows Debug's own game (its date spent AP from 9).
  const debug = await page.evaluate((name) => {
    const hook = (window as unknown as Record<string, DreamscapeDebugHook>)[name];
    return { state: hook.getState(), scene: hook.getScene() };
  }, DEBUG_HOOK_NAME);
  expect(debug.state?.activeDate?.dateId).toBe("milano_brera_date_01");
  expect(debug.state?.ap).toBeLessThan(9);
  expect(debug.scene?.url).toBe(url);
  // Back on the settings screen, the same scene's URL is offered for copying.
  await ops.backToDebugSettings(page);
  await expect(page.getByTestId("debug-url")).toHaveValue(new URL(url, page.url()).href);
  // A URL that does not fit the content says why and links back to the settings screen.
  await page.goto("/?debug&city=milano&scene=battle&target=gt_delhi_main_red_fort_battle");
  await expect(page.getByRole("alert")).toHaveText("「gt_delhi_main_red_fort_battle」はミラノの「バトル」にありません。");
  await page.getByRole("link", { name: "場面の確認（設定画面）へ" }).click();
  await expect(page.getByTestId("debug-panel")).toBeVisible();
});
