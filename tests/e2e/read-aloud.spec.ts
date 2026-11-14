import { devModules, expect, ops, playUntil, presentationKey, savedGame, test, tier } from "./helpers";

// 「問題が出たら英語を自動で読み上げる」 (2026-11-14 user decision; ReadAloud.tsx useAutoReadAloud): on by default, a
// quiz's question is read aloud once as it shows, with no press, and its reading stops at the answer; turned off in
// ゲームの設定, nothing is read. The first tap primes the page's speech (an empty, silent utterance: iOS Safari speaks with
// no gesture only after one). The browser's speech here is a fake put in before the page's code: it records what the page
// speaks, keeps a reading going until it is cancelled (Chromium ends a cut one with "error") and ends an empty one at once.
// State shortcut (lane 2 in docs/10), as in short-screen.spec.ts: the page's own scene builders open the default Debug
// city's first ordinary battle on a cleared city and the game's saveGame stores it as a normal save; the quiz is played
// in the UI.

// Long flow (docs/10「不安定さと時間の決まり」): the app loads twice on the development server, then two questions are played.
test.describe.configure({ timeout: 120_000 });

type Spoken = { text: string; volume: number; lang: string };

/** In the page, before its code: the fake speech (window.speechSynthesis) and its record (window.__speech). */
function fakeSpeech() {
  const spoken: { text: string; volume: number; lang: string }[] = [];
  const live: SpeechSynthesisUtterance[] = [];
  const record = { spoken, cancels: 0 };
  const end = (utterance: SpeechSynthesisUtterance, type: "end" | "error") => {
    const at = live.indexOf(utterance);
    if (at >= 0) live.splice(at, 1);
    utterance.dispatchEvent(new Event(type));
  };
  const synth = {
    get speaking() {
      return live.length > 0;
    },
    pending: false,
    speak(utterance: SpeechSynthesisUtterance) {
      spoken.push({ text: utterance.text, volume: utterance.volume, lang: utterance.lang });
      live.push(utterance);
      if (!utterance.text) setTimeout(() => end(utterance, "end"), 0);
    },
    cancel() {
      record.cancels++;
      for (const utterance of [...live]) end(utterance, "error");
    },
    getVoices: () => [],
  };
  (window as unknown as { __speech: typeof record }).__speech = record;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, get: () => synth });
}

const said = (text: string) => text.replace(/\s+/gu, " ").trim();

test("a quiz's question is read aloud as it shows, stops at the answer, and not with the setting off", { tag: tier.debug }, async ({ page }) => {
  await page.addInitScript(fakeSpeech);
  await page.goto("/");
  const placed = await page.evaluate(async ({ modules }) => {
    const { battles, battleQuizzes } = await import(/* @vite-ignore */ modules.content);
    const { debugTargets, defaultDebugCityId } = await import(/* @vite-ignore */ modules.debugState);
    const builders = await import(/* @vite-ignore */ modules.builders);
    const { saveGame } = await import(/* @vite-ignore */ modules.persistence);
    const { journeyStorage } = await import(/* @vite-ignore */ modules.journeyStorage);
    const { getJourneyForCity } = await import(/* @vite-ignore */ modules.journeys);
    const cityId: string = defaultDebugCityId;
    const battle = battles.find((item: { id: string; reasoning?: unknown }) => !item.reasoning &&
      debugTargets(cityId).battle.some((target: { id: string; unavailable?: string }) => target.id === item.id && !target.unavailable));
    const questions: { questionEn: string; correctOptionId: string }[] = battleQuizzes[battle.quizId].questions;
    const journeyId: string = getJourneyForCity(cityId).id;
    const state = builders.openBattleScene(builders.completedCity(cityId, { names: ["航", "澪"] }), battle.id);
    return {
      journeyId, saved: saveGame(journeyStorage(localStorage, journeyId), state),
      questions: questions.map((question) => ({ en: question.questionEn, right: question.correctOptionId })),
    };
  }, { modules: devModules });
  expect(placed.saved, "the battle placed as a normal save").toEqual({ ok: true });
  expect(placed.questions.length, "the battle has two questions or more").toBeGreaterThanOrEqual(2);
  const [first, second] = placed.questions;
  const spoken = () => page.evaluate(() => (window as unknown as { __speech: { spoken: Spoken[] } }).__speech.spoken);
  const cancels = () => page.evaluate(() => (window as unknown as { __speech: { cancels: number } }).__speech.cancels);

  // The default Debug city belongs to the default journey: the saved battle comes back at once, at its opening lines.
  await page.goto("/");
  await expect(page.getByRole("region", { name: "クイズ", exact: true })).toBeVisible();
  const source = savedGame(placed.journeyId);
  expect((await source(page))!.activeBattle?.phase, "the battle opens at its lines, before its first question").toBe("dialogue");
  expect(await spoken(), "nothing is read before the first tap").toEqual([]);

  // Tapped through to the first question: the first tap primed the speech, and the question is read once, in English.
  await playUntil(page, (state) => state.activeBattle?.phase === "question" && state.activeBattle.roundIndex === 0, { source });
  await expect.poll(spoken, { message: "the question read as it shows" }).toContainEqual({ text: said(first.en), volume: 1, lang: "en-US" });
  const read = await spoken();
  expect(read[0], "the first tap primed the speech with an empty, silent utterance").toEqual({ text: "", volume: 0, lang: "" });
  expect(read.filter((item) => item.text).map((item) => item.text), "only the question, nothing else").toEqual([said(first.en)]);
  // No speaker buttons by default (「英語を読み上げるボタンを出す」 is off): the reading needs none.
  await expect(page.getByTestId("read-aloud-question")).toHaveCount(0);
  await page.waitForTimeout(1_000);
  expect((await spoken()).filter((item) => item.text === said(first.en)), "read once, not again as the screen changes").toHaveLength(1);

  // The answer stops the reading (still going: the fake ends it only when cancelled).
  const before = await cancels();
  await page.getByTestId(`answer-${first.right}`).click();
  await expect.poll(cancels, { message: "the answer stopped the reading" }).toBeGreaterThan(before);
  await expect.poll(async () => (await source(page))!.activeBattle?.phase).toBe("feedback");

  // Turned off in ゲームの設定 (and kept as this device's preference), the next question is not read.
  const settings = await ops.openSettings(page);
  const auto = settings.getByRole("checkbox", { name: "問題が出たら英語を自動で読み上げる" });
  await expect(auto).toBeChecked();
  await auto.uncheck();
  await ops.closeDialog(settings);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).autoReadAloud, presentationKey)).toBe(false);
  await playUntil(page, (state) => state.activeBattle?.phase === "question" && state.activeBattle.roundIndex === 1, { source });
  await page.waitForTimeout(1_000);
  expect((await spoken()).map((item) => item.text), "the second question not read with the setting off").not.toContain(said(second.en));
});
