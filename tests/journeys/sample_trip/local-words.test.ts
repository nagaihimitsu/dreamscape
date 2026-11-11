// The sample's word of the country (fictional; 2026-11-11 user decision, its optional part 「その国の言葉」): the guide's
// `# local_word:` line reaches the screen through the game state, and through its save (content:build's checks of the
// words: local-words-build.test.ts).
import { beforeAll, describe, expect, it } from "vitest";
import { localWords } from "../../../src/content";
import { getJourney } from "../../../src/content/journeys";
import { cityStart } from "../../../src/dev/scenario-builders";
import { advanceEncounter, chooseEncounter, continueTourismEncounters, encounterCanFinish, finishEncounter } from "../../../src/domain/encounter";
import { validateGameState, type GameState } from "../../../src/domain/game";
import { advanceTourismGuide, chooseTourismGuide } from "../../../src/domain/tourism";
import { beginTravelEvent, finishTravelEventIfComplete } from "../../../src/domain/travel-game";
import { lineWordsOnScreen } from "../../../src/features/learning/local-words";

const WORD = "smp_mihon_word_trisol";
const saved = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));

beforeAll(() => {
  if (!getJourney("sample_trip")) throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してください。");
});

describe("the sample's word of the country at play", () => {
  it("is taught by the guide's line on the stone over the door, only there, and the save keeps the line's words", () => {
    expect(localWords.map((word) => word.id)).toContain(WORD);
    const start = cityStart("mihon");
    let s = saved(beginTravelEvent(start, "smp_mihon_main_clock_tower", "walk", start.revision, () => 0));
    // The stall (another optional part) comes first: read on with its first choices until the guide opens.
    for (let step = 0; s.activeEncounter; step++) {
      expect(step).toBeLessThan(60);
      const choices = s.activeEncounter.frame.choices;
      if (choices.length) { s = saved(chooseEncounter(s, choices[0].index, s.revision, () => 0)); continue; }
      const next = encounterCanFinish(s) ? finishEncounter(s, s.revision) : advanceEncounter(s, s.revision);
      s = saved(finishTravelEventIfComplete(s, continueTourismEncounters(s, next, () => 0)));
    }
    expect(s.activeTourism?.phase).toBe("guide");
    const taught: [readonly string[], string][] = [];
    for (let step = 0; s.activeTourism?.phase === "guide"; step++) {
      expect(step).toBeLessThan(40);
      const words = lineWordsOnScreen(s);
      if (words.length) taught.push([words, s.activeTourism.frame!.text]);
      const choices = s.activeTourism.frame?.choices ?? [];
      s = saved(choices.length ? chooseTourismGuide(s, choices[0].index, s.revision) : advanceTourismGuide(s, s.revision));
    }
    expect(taught).toEqual([[[WORD], expect.stringContaining("Trisól（トリソル）")]]);
  });
});
