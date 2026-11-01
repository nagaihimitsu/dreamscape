import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Story } from "inkjs";
import { expect, it } from "vitest";
import freeTime from "../tests/fixtures/phase7-free-time.json";
import { dates, landmarks, stories } from "../src/content";
import { encounters } from "../src/content/encounters";
import { normalizeEncounterCatalog } from "../src/content/encounter-schemas";
import { prepareContentFixture } from "../src/content/test-fixtures";
import { advanceEncounter, chooseEncounter, finishEncounter, startEncounter } from "../src/domain/encounter";
import { advanceDate, chooseDate, finishDate, startDate, validateGameState } from "../src/domain/game";
import { buildContent } from "./content-pipeline";

/** The fixture is isolated: no playable dialogue or catalogs are edited. */
it("builds a new encounter and date with only Ink and small catalog entries", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "dreamscape-authoring-"));
  const encounterId = "fixture_simple_encounter";
  const paidEncounterId = "fixture_paid_encounter";
  const dateId = "fixture_simple_date";
  const encounterStory = "encounters/fixture_simple_encounter";
  const paidEncounterStory = "encounters/fixture_paid_encounter";
  const dateStory = "milano/fixture_simple_date";
  try {
    await prepareContentFixture(root);
    const encountersPath = path.join(root, "content/encounters/catalog.json");
    const encounterCatalog = JSON.parse(await readFile(encountersPath, "utf8"));
    encounterCatalog.encounters.push({
      id: "fixture_simple_encounter",
      landmarkId: "galleria_vittorio_emanuele_ii",
      titleJa: "追加の交流",
      storyId: "encounters/fixture_simple_encounter",
    });
    encounterCatalog.encounters.push({
      id: paidEncounterId,
      landmarkId: "galleria_vittorio_emanuele_ii",
      titleJa: "追加の買い物",
      storyId: paidEncounterStory,
      options: [
        { id: "tea", costEuro: 4 },
        { id: "cake", costEuro: 8 },
        { id: "skip" },
      ],
    });
    await writeFile(encountersPath, JSON.stringify(encounterCatalog));
    await writeFile(path.join(root, "content/stories/encounters/fixture_simple_encounter.ink"), `VAR player_name = ""
VAR heroine_name = ""
# background: milano_galleria
# speaker: narrator
# reaction: heroine,exasperated,sigh
「それは本当ですか？」
* [Look closer.]
    # speaker: heroine
    # reaction: heroine,smile,sparkle
    「一緒に見てみよう」
    -> END
* [Ask a question.]
    # speaker: heroine
    「どこが気になったの？」
    -> END
* [Keep walking.]
    # speaker: heroine
    「また後で見に行こう」
    -> END
`);
    await writeFile(path.join(root, "content/stories/encounters/fixture_paid_encounter.ink"), `VAR player_name = ""
VAR heroine_name = ""
# speaker: narrator
店員がメニューを差し出した。
* [No thanks. # option: skip # translation: 今は結構です。]
    # speaker: heroine
    「また今度にしよう」
    -> END
* [Tea, please. # option: tea # translation: お茶をください。]
    # speaker: heroine
    「お茶にしよう」
    -> END
* [Cake, please. # option: cake # translation: ケーキをください。]
    # speaker: heroine
    「ケーキにしよう」
    -> END
`);

    const datesPath = path.join(root, "content/romance/date_catalog.json");
    const dateCatalog = JSON.parse(await readFile(datesPath, "utf8"));
    dateCatalog.dates.push({
      id: "fixture_simple_date",
      chapterId: "milano",
      titleJa: "追加のデート",
      storyId: "milano/fixture_simple_date",
      backgroundAssetId: "milano_la_scala_date",
    });
    await writeFile(datesPath, JSON.stringify(dateCatalog));
    let dateInk = await readFile(path.join(root, "content/stories/milano/la_scala_refresh_01.ink"), "utf8");
    for (const moment of ["first", "second"]) {
      for (const [oldName, profile] of [["joke", "playful"], ["listen", "attentive"], ["honest", "honest"]])
        dateInk = dateInk.replace(`milano_la_scala_${moment}_${oldName}_refresh`, `common_date_${moment}_${profile}`);
    }
    await writeFile(path.join(root, "content/stories/milano/fixture_simple_date.ink"), dateInk);

    const result = await buildContent(root, false);
    expect(result.dates.find((date) => date.id === "fixture_simple_date")).toMatchObject({
      kind: "normal", apCost: 2, choiceCount: 2, effectCount: 2,
    });

    // Exercise the actual compiled Ink and its choice state, including restoring
    // the same checkpoint before selecting a branch. Presentation is attached
    // to the line rather than indexed by its Japanese text.
    const story = new Story(result.stories["encounters/fixture_simple_encounter"]);
    expect(story.Continue()?.trim()).toBe("「それは本当ですか？」");
    expect(story.currentTags).toContain("reaction: heroine,exasperated,sigh");
    expect(story.currentChoices.map((choice) => choice.text.trim())).toEqual([
      "Look closer.", "Ask a question.", "Keep walking.",
    ]);
    const checkpoint = story.state.ToJson();
    const restored = new Story(result.stories["encounters/fixture_simple_encounter"]);
    restored.state.LoadJson(checkpoint);
    restored.ChooseChoiceIndex(0);
    expect(restored.Continue()?.trim()).toBe("「一緒に見てみよう」");
    expect(restored.currentTags).toContain("reaction: heroine,smile,sparkle");
    expect(restored.canContinue).toBe(false);

    // Inject the isolated fixture into the already loaded registries, so the
    // same game-domain functions and save validation used by the app exercise
    // the newly authored content, without touching the production files.
    encounters.encounters.push(normalizeEncounterCatalog(encounterCatalog, landmarks).encounters.find((entry) => entry.id === encounterId)!);
    encounters.encounters.push(normalizeEncounterCatalog(encounterCatalog, landmarks).encounters.find((entry) => entry.id === paidEncounterId)!);
    dates.push(result.dates.find((entry) => entry.id === dateId)!);
    stories[encounterStory] = result.stories[encounterStory];
    stories[paidEncounterStory] = result.stories[paidEncounterStory];
    stories[dateStory] = result.stories[dateStory];
    const restore = (state: unknown) => validateGameState(JSON.parse(JSON.stringify(state)));
    let state = restore(freeTime.cityClearViewed);
    const initialBudget = state.travelBudget;
    state = startEncounter(state, encounterId, () => 0);
    expect(state.activeEncounter?.encounterId).toBe(encounterId);
    state = restore(state);
    while (state.activeEncounter && !state.activeEncounter.frame.choices.length && !state.activeEncounter.frame.ended)
      state = restore(advanceEncounter(state, state.revision));
    expect(state.activeEncounter?.frame.choices.map((choice) => choice.text)).toEqual([
      "Look closer.", "Ask a question.", "Keep walking.",
    ]);
    state = chooseEncounter(state, 0, state.revision);
    expect(state.activeEncounter?.selectedOptionId).toBe("choice_1");
    expect(state.travelBudget).toBe(initialBudget);
    state = restore(state);
    while (state.activeEncounter && !state.activeEncounter.frame.ended)
      state = restore(advanceEncounter(state, state.revision));
    state = restore(finishEncounter(state, state.revision));
    expect(state.activeEncounter).toBeNull();
    expect(state.completedEncounterIds).toContain(encounterId);
    expect(state.travelBudget).toBe(initialBudget);

    // Ink order is deliberately different from the rules catalog. IDs, not
    // position or duplicated English text, must determine the price.
    state = restore(startEncounter(state, paidEncounterId, () => 0));
    while (state.activeEncounter && !state.activeEncounter.frame.choices.length && !state.activeEncounter.frame.ended)
      state = restore(advanceEncounter(state, state.revision));
    expect(state.activeEncounter?.frame.choices.map(({ text, optionId, translationJa }) => ({ text, optionId, translationJa }))).toEqual([
      { text: "No thanks.", optionId: "skip", translationJa: "今は結構です。" },
      { text: "Tea, please.", optionId: "tea", translationJa: "お茶をください。" },
      { text: "Cake, please.", optionId: "cake", translationJa: "ケーキをください。" },
    ]);
    const noPurchase = restore(chooseEncounter(state, 0, state.revision));
    expect(noPurchase.activeEncounter?.selectedOptionId).toBe("skip");
    expect(noPurchase.travelBudget).toBe(initialBudget);
    const oldRevision = state.revision;
    state = restore(chooseEncounter(state, 1, oldRevision));
    expect(state.activeEncounter?.selectedOptionId).toBe("tea");
    expect(state.travelBudget).toBe(initialBudget - 4);
    expect(chooseEncounter(state, 1, oldRevision)).toBe(state);
    while (state.activeEncounter && !state.activeEncounter.frame.ended)
      state = restore(advanceEncounter(state, state.revision));
    state = restore(finishEncounter(state, state.revision));
    expect(state.completedEncounterIds).toContain(paidEncounterId);
    expect(state.travelBudget).toBe(initialBudget - 4);

    const apTotal = (game: typeof state) => game.ap + game.pendingApRewards.reduce((total, reward) => total + reward.remainingAp, 0);
    const initialAp = apTotal(state);
    const initialMemories = [...state.memories];
    state = startDate(state, dateId, () => 0);
    expect(state.activeDate?.dateId).toBe(dateId);
    expect(apTotal(state)).toBe(initialAp - 2);
    for (let steps = 0; state.activeDate && steps < 80; steps++) {
      state = restore(state);
      const current = state.activeDate!;
      if (current.frame.ended) state = finishDate(state, state.revision);
      else if (current.frame.choices.length) {
        const oldRevision = state.revision;
        const choiceIndex = current.choiceCount;
        state = chooseDate(state, choiceIndex, oldRevision);
        expect(state.activeDate?.resolvedChoices.at(-1)?.effectId).toBe(
          choiceIndex === 0 ? "common_date_first_playful" : "common_date_second_attentive",
        );
        expect(chooseDate(state, choiceIndex, oldRevision)).toBe(state);
      }
      else state = advanceDate(state, state.revision);
    }
    state = restore(state);
    expect(state.activeDate).toBeNull();
    expect(state.playedDateIds).toContain(dateId);
    expect(apTotal(state)).toBe(initialAp - 2);
    expect(state.memories).toEqual(initialMemories);
  } finally {
    const encounterIndex = encounters.encounters.findIndex((entry) => entry.id === encounterId);
    if (encounterIndex !== -1) encounters.encounters.splice(encounterIndex, 1);
    const paidEncounterIndex = encounters.encounters.findIndex((entry) => entry.id === paidEncounterId);
    if (paidEncounterIndex !== -1) encounters.encounters.splice(paidEncounterIndex, 1);
    const dateIndex = dates.findIndex((entry) => entry.id === dateId);
    if (dateIndex !== -1) dates.splice(dateIndex, 1);
    delete stories[encounterStory];
    delete stories[paidEncounterStory];
    delete stories[dateStory];
    await rm(root, { recursive: true, force: true });
  }
}, 180_000);
