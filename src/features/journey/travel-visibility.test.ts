import { describe, expect, it } from "vitest";
import { getCityContent } from "../../content";
import { createGame } from "../../domain/game";
import { isTravelEventVisible } from "../../domain/travel-game";

const milanoTravelCatalog = getCityContent("milano").travel;

describe("destination visibility", () => {
  const event = (id: string) => milanoTravelCatalog.events.find((item) => item.id === id)!;

  it("hides completed events while leaving other events at the same place available", () => {
    const initial = createGame();
    const state = { ...initial,
      completedEpisodeIds: ["milano_galleria_episode"],
      battleRecords: [{ battleId: "milano_la_scala_b01", attempts: 1, firstScore: 0, bestScore: 0, lastScore: 0 }],
      playedDateIds: ["milano_rain_pause_01"],
    };
    expect(isTravelEventVisible(state, event("milano_galleria_episode"))).toBe(false);
    expect(isTravelEventVisible(state, event("milano_la_scala_b01"))).toBe(false);
    expect(isTravelEventVisible(state, event("milano_rain_pause_01"))).toBe(false);
    expect(isTravelEventVisible(state, event("milano_duomo_episode"))).toBe(true);
  });
});
