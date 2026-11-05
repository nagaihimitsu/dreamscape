import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { indiaRequirements, loadIndiaScaffold } from "./india-scaffold";
import { prepareIndiaRelease } from "./promote-india";

/** Explicit unpublished fixture; this test must not depend on India's release date. */
function prepareUnpublishedFixture(root: string) {
  const plans = indiaRequirements(loadIndiaScaffold(root));
  const cityIds = new Set(plans.map((city) => city.cityId));
  const eventIds = new Set(plans.flatMap((city) => [...city.main.map((event) => event.eventId), city.finale.eventId]));
  const dateIds = new Set(plans.flatMap((city) => city.dates.map((event) => event.eventId)));
  const landmarkIds = new Set(plans.flatMap((city) => city.main.map((event) => event.landmarkId)));
  const battleIds = new Set(plans.flatMap((city) => [...city.main.map((event) => event.battleId), city.finale.battleId]));
  const quizIds = new Set(plans.flatMap((city) => [...city.main.map((event) => event.quizId), city.finale.quizId]));
  const memoryIds = new Set(plans.flatMap((city) => city.dates.map((event) => event.memoryId)));
  const storyIds = new Set(plans.flatMap((city) => [...city.main.flatMap((event) => [event.guideStoryId, event.battleStoryId]),
    ...city.dates.map((event) => event.storyId), city.finale.battleStoryId, city.finale.epilogueStoryId]));
  const edit = (file: string, change: (data: any) => void) => {
    const target = path.join(root, file);
    const data = JSON.parse(readFileSync(target, "utf8"));
    change(data);
    writeFileSync(target, JSON.stringify(data));
  };
  edit("content/journeys/golden_triangle/manifest.json", (data) => { data.status = "preparing"; });
  for (const city of plans) {
    edit(`content/cities/${city.cityId}.json`, (data) => {
      data.productionStatus = "prototype";
      if (data.arrivalStoryId) storyIds.add(data.arrivalStoryId);
      delete data.arrivalStoryId;
    });
    edit(`content/travel/${city.cityId}.json`, (data) => {
      data.events = data.events.filter((event: any) => event.id !== city.finale.eventId).map((event: any) => ({ ...event, contentStatus: "pending_content" }));
      for (const place of data.places) if (place.landmarkIds) place.landmarkIds = place.landmarkIds.filter((id: string) => !landmarkIds.has(id));
    });
  }
  edit("content/progression/journey.json", (data) => {
    data.episodes = data.episodes.filter((entry: any) => !cityIds.has(entry.cityId));
    data.rewards = data.rewards.filter((entry: any) => !eventIds.has(entry.episodeId));
  });
  edit("content/battles/catalog.json", (data) => { data.battles = data.battles.filter((entry: any) => !battleIds.has(entry.id)); });
  edit("content/romance/date_catalog.json", (data) => { data.dates = data.dates.filter((entry: any) => !dateIds.has(entry.id)); });
  edit("content/tourism/catalog.json", (data) => {
    data.landmarks = data.landmarks.filter((entry: any) => !cityIds.has(entry.cityId));
    data.clues = data.clues.filter((entry: any) => !landmarkIds.has(entry.landmarkId));
  });
  edit("content/romance/effect_catalog.json", (data) => { data.effects = data.effects.filter((entry: any) => !memoryIds.has(entry.memoryId)); });
  edit("content/romance/presentation.json", (data) => { for (const id of memoryIds) delete data.memories[id]; });
  for (const file of ["content/presentation/dialogue-expressions.json", "content/presentation/dialogue-reactions.json"])
    edit(file, (data) => { data.entries = data.entries.filter((entry: any) => !storyIds.has(entry.storyId)); });
  for (const id of storyIds) rmSync(path.join(root, "content/stories", `${id}.ink`), { force: true });
  const questionIds = new Set<string>();
  for (const file of readdirSync(path.join(root, "content/quizzes"))) {
    if (!file.endsWith(".json")) continue;
    const target = path.join(root, "content/quizzes", file);
    const quiz = JSON.parse(readFileSync(target, "utf8"));
    if (!quizIds.has(quiz.id)) continue;
    for (const question of quiz.questions) questionIds.add(question.id);
    rmSync(target);
  }
  edit("content/learning/translations.json", (data) => { for (const id of questionIds) delete data.questions[id]; });
}

// Test-only scripts and questions are copied into a temporary project. They
// never become production India content and do not claim to describe India.
describe("India release pipeline", () => {
  it("validates, previews and releases Delhi alone, and can be rerun without duplicates", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "dreamscape-india-full-release-"));
    try {
      const source = process.cwd();
      cpSync(path.join(source, "content"), path.join(root, "content"), { recursive: true });
      cpSync(path.join(source, "public"), path.join(root, "public"), { recursive: true });
      const observation = "authoring/drafts/golden-triangle/observation-cards.json";
      mkdirSync(path.dirname(path.join(root, observation)), { recursive: true });
      cpSync(path.join(source, observation), path.join(root, observation));
      prepareUnpublishedFixture(root);
      const input = loadIndiaScaffold(root);
      const plan = indiaRequirements(input, ["delhi"])[0];
      const read = (file: string) => readFileSync(path.join(source, file), "utf8");
      const write = (file: string, value: string) => { const target = path.join(root, file); mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, value); };
      const scene = { titleJa: "試験", descriptionJa: "試験の場面", clearTitleJa: "試験完了", clearDescriptionJa: "試験の記録",
        enemyNameJa: "試験人物", enemyTitleJa: "試験の人", enemyDescriptionJa: "試験用の人物" };
      const date = { titleJa: "試験", descriptionJa: "試験の場面", memoryTitleJa: "試験の思い出", memoryDescriptionJa: "試験の記録" };
      const narrative = { main: Object.fromEntries(plan.main.map((item) => [item.eventId, scene])),
        dates: Object.fromEntries(plan.dates.map((item) => [item.eventId, date])),
        finales: { delhi: { ...scene, placeId: plan.main[0].landmarkId, activityMinutes: 60 } } };
      const narrativeFile = path.join(root, "scenario.json");
      writeFileSync(narrativeFile, JSON.stringify(narrative));
      const originalQuiz = JSON.parse(read("content/quizzes/sound_duomo_B1.json"));
      const originalTranslations = JSON.parse(read("content/learning/translations.json")).questions;
      const translations: Record<string, { questionJa: string; optionsJa: Record<string, string> }> = {};
      for (const item of plan.main) {
        write(`content/stories/${item.guideStoryId}.ink`, read("content/stories/tourism/sound_duomo.ink"));
        write(`content/stories/${item.battleStoryId}.ink`, read("content/stories/battles/sound_duomo.ink"));
        const quiz = { ...structuredClone(originalQuiz), id: item.quizId, landmarkId: item.landmarkId };
        quiz.questions.forEach((question: { id: string }, index: number) => {
          const translated = originalTranslations[question.id];
          question.id = `${item.quizId}_${index}`;
          translations[question.id] = { questionJa: translated.questionJa, optionsJa: translated.optionsJa };
        });
        write(`content/quizzes/${item.quizId}.json`, JSON.stringify(quiz));
      }
      const dateTemplate = read("content/stories/milano/sound_cafe_01.ink");
      for (const item of plan.dates) {
        let story = dateTemplate;
        const map: Record<string, string> = {
          common_date_first_playful: item.effectIds.first.playful, common_date_first_attentive: item.effectIds.first.attentive,
          common_date_first_honest: item.effectIds.first.honest, sound_cafe_01_2_1: item.effectIds.second.honest,
          sound_cafe_01_2_2: item.effectIds.second.attentive, sound_cafe_01_2_3: item.effectIds.second.bold,
        };
        for (const [from, to] of Object.entries(map)) story = story.replaceAll(from, to);
        write(`content/stories/${item.storyId}.ink`, story);
      }
      write(`content/stories/${plan.finale.battleStoryId}.ink`, read("content/stories/battles/sound_finale.ink"));
      write(`content/stories/${plan.finale.epilogueStoryId}.ink`, read("content/stories/milano/sound_epilogue.ink"));
      const finalQuiz = JSON.parse(read("content/quizzes/sound_finale_B1.json"));
      finalQuiz.id = plan.finale.quizId; finalQuiz.cityId = "delhi";
      finalQuiz.questions.forEach((question: { id: string }, index: number) => {
        const translated = originalTranslations[question.id];
        question.id = `${plan.finale.quizId}_${index}`;
        translations[question.id] = { questionJa: translated.questionJa, optionsJa: translated.optionsJa };
      });
      write(`content/quizzes/${plan.finale.quizId}.json`, JSON.stringify(finalQuiz));
      const translationsFile = path.join(root, "translations.json");
      writeFileSync(translationsFile, JSON.stringify({ schemaVersion: 1, questions: translations }));
      const cityFile = path.join(root, "content/cities/delhi.json");
      const before = readFileSync(cityFile, "utf8");
      await expect(prepareIndiaRelease(root, true, "delhi", narrativeFile)).rejects.toThrow(/quiz translation is missing/i);
      expect(readFileSync(cityFile, "utf8")).toBe(before);
      const guidePath = path.join(root, "content/stories", `${plan.main[0].guideStoryId}.ink`);
      const guide = readFileSync(guidePath, "utf8");
      rmSync(guidePath);
      await expect(prepareIndiaRelease(root, true, "delhi", narrativeFile, translationsFile)).rejects.toThrow(/unfinished scenario/i);
      expect(readFileSync(cityFile, "utf8")).toBe(before);
      writeFileSync(guidePath, guide);
      await prepareIndiaRelease(root, false, "delhi", narrativeFile, translationsFile);
      expect(readFileSync(cityFile, "utf8")).toBe(before);
      await prepareIndiaRelease(root, true, "delhi", narrativeFile, translationsFile);
      expect(JSON.parse(readFileSync(cityFile, "utf8")).productionStatus).toBe("complete");
      expect(JSON.parse(readFileSync(path.join(root, "content/cities/agra.json"), "utf8")).productionStatus).toBe("prototype");
      expect(JSON.parse(readFileSync(path.join(root, "content/travel/agra.json"), "utf8")).events.every((event: { contentStatus?: string }) => event.contentStatus === "pending_content")).toBe(true);
      expect(JSON.parse(readFileSync(path.join(root, "content/journeys/golden_triangle/manifest.json"), "utf8")).status).toBe("available");
      const journeyFile = path.join(root, "content/progression/journey.json");
      const after = readFileSync(journeyFile, "utf8");
      expect(JSON.parse(after).episodes.filter((episode: { cityId: string }) => episode.cityId === "delhi")).toHaveLength(5);
      const translated = JSON.parse(readFileSync(path.join(root, "content/learning/translations.json"), "utf8")).questions[`${plan.main[0].quizId}_0`];
      expect(translated.source.questionEn).toBe(originalQuiz.questions[0].questionEn);
      expect(existsSync(path.join(root, "content/stories", `${plan.finale.epilogueStoryId}.ink`))).toBe(true);
      await prepareIndiaRelease(root, true, "delhi", narrativeFile, translationsFile);
      expect(readFileSync(journeyFile, "utf8")).toBe(after);

      // Add only the second city's own hypothetical content. The already
      // published first city must not be regenerated or duplicated.
      const second = indiaRequirements(input, ["agra"])[0];
      const secondTranslations: typeof translations = {};
      const secondNarrative = { main: Object.fromEntries(second.main.map((item) => [item.eventId, scene])),
        dates: Object.fromEntries(second.dates.map((item) => [item.eventId, date])),
        finales: { agra: { ...scene, placeId: second.main[0].landmarkId, activityMinutes: 60 } } };
      const secondNarrativeFile = path.join(root, "agra-scenario.json");
      writeFileSync(secondNarrativeFile, JSON.stringify(secondNarrative));
      for (const item of second.main) {
        write(`content/stories/${item.guideStoryId}.ink`, read("content/stories/tourism/sound_duomo.ink"));
        write(`content/stories/${item.battleStoryId}.ink`, read("content/stories/battles/sound_duomo.ink"));
        const quiz = { ...structuredClone(originalQuiz), id: item.quizId, landmarkId: item.landmarkId };
        quiz.questions.forEach((question: { id: string }, index: number) => {
          const translated = originalTranslations[question.id];
          question.id = `${item.quizId}_${index}`;
          secondTranslations[question.id] = { questionJa: translated.questionJa, optionsJa: translated.optionsJa };
        });
        write(`content/quizzes/${item.quizId}.json`, JSON.stringify(quiz));
      }
      for (const item of second.dates) {
        let story = dateTemplate;
        const map: Record<string, string> = {
          common_date_first_playful: item.effectIds.first.playful, common_date_first_attentive: item.effectIds.first.attentive,
          common_date_first_honest: item.effectIds.first.honest, sound_cafe_01_2_1: item.effectIds.second.honest,
          sound_cafe_01_2_2: item.effectIds.second.attentive, sound_cafe_01_2_3: item.effectIds.second.bold,
        };
        for (const [from, to] of Object.entries(map)) story = story.replaceAll(from, to);
        write(`content/stories/${item.storyId}.ink`, story);
      }
      write(`content/stories/${second.finale.battleStoryId}.ink`, read("content/stories/battles/sound_finale.ink"));
      write(`content/stories/${second.finale.epilogueStoryId}.ink`, read("content/stories/milano/sound_epilogue.ink"));
      const agraQuiz = JSON.parse(read("content/quizzes/sound_finale_B1.json"));
      agraQuiz.id = second.finale.quizId; agraQuiz.cityId = "agra";
      agraQuiz.questions.forEach((question: { id: string }, index: number) => {
        const translated = originalTranslations[question.id];
        question.id = `${second.finale.quizId}_${index}`;
        secondTranslations[question.id] = { questionJa: translated.questionJa, optionsJa: translated.optionsJa };
      });
      write(`content/quizzes/${second.finale.quizId}.json`, JSON.stringify(agraQuiz));
      const secondTranslationsFile = path.join(root, "agra-translations.json");
      writeFileSync(secondTranslationsFile, JSON.stringify({ schemaVersion: 1, questions: secondTranslations }));
      await prepareIndiaRelease(root, true, "agra", secondNarrativeFile, secondTranslationsFile);
      const afterSecond = JSON.parse(readFileSync(journeyFile, "utf8"));
      expect(afterSecond.episodes.filter((episode: { cityId: string }) => episode.cityId === "delhi")).toHaveLength(5);
      expect(afterSecond.episodes.filter((episode: { cityId: string }) => episode.cityId === "agra")).toHaveLength(5);
      expect(JSON.parse(readFileSync(path.join(root, "content/cities/agra.json"), "utf8")).productionStatus).toBe("complete");
      expect(JSON.parse(readFileSync(path.join(root, "content/cities/jaipur.json"), "utf8")).productionStatus).toBe("prototype");
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 120_000);
});
