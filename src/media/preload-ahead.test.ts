import { describe, expect, it } from "vitest";
import { completedCity, rollTickets, startDateScene, withAp } from "../dev/scenario-builders";
import { characterPicture } from "../components/character-catalog";
import { getCityBackdropPath } from "../content/city-backdrop";
import { advanceDate } from "../domain/game";
import { getTravelDestinations } from "../domain/travel-destinations";
import { contentMediaCatalog, destinationRequests, freeTimeRequests, gameRequests, sceneStoryOnScreen, titleRequests } from "./preload-ahead";
import { requestId, type PreloadRequest } from "./preload-queue";
import { frameMedia } from "./scene-media";

// What the game asks the background loading for (2026-11-13), on India's first city: a date with voices, free time,
// the title. Each file named must be the one the screen shows (the same rules), at the moment it is about to.

const delhiCleared = withAp(completedCity("delhi", { names: ["航", "澪"] }), 12);
const date = startDateScene(delhiCleared, "gt_delhi_date_chandni_chowk", rollTickets.positive);
const priorityOf = (requests: readonly PreloadRequest[], request: PreloadRequest) =>
  requests.filter((item) => requestId(item) === requestId(request)).map((item) => item.priority).sort()[0];

describe("gameRequests in a story scene", () => {
  it("asks for the files of the next lines, the next one's first, as the game then shows them", () => {
    const requests = gameRequests(date);
    const look = sceneStoryOnScreen(date)!.look;
    let state = date;
    let voices = 0;
    for (let line = 0; line < 4 && !state.activeDate!.frame.choices.length; line++) {
      state = advanceDate(state, state.revision);
      for (const request of frameMedia(state.activeDate!.frame, look, contentMediaCatalog, "next")) {
        const asked = priorityOf(requests, request);
        expect(asked, `${request.kind} ${request.key} of line +${line + 1}`).toBeDefined();
        if (line === 0) expect(asked, `${request.kind} ${request.key} of the next line`).toBe("next");
        if (request.kind === "voice") voices++;
      }
    }
    // The date is voiced: the lines ahead name their recordings.
    expect(voices).toBeGreaterThan(0);
    // The free time the scene ends in comes last, quietly.
    const backdrop = getCityBackdropPath("delhi");
    if (backdrop) expect(priorityOf(requests, { kind: "image", key: backdrop, priority: "idle" })).toBe("idle");
  });

  it("reads ahead without changing the game", () => {
    const before = JSON.stringify(date);
    gameRequests(date);
    expect(JSON.stringify(date)).toBe(before);
  });
});

describe("gameRequests in free time", () => {
  it("asks for the row's photo cards soon, and the heroine as she stands in this city when the network is free", () => {
    const requests = gameRequests(delhiCleared);
    expect(requests.length).toBeGreaterThan(1);
    expect(requests.filter((request) => request.kind === "image" && request.key.endsWith(".card.webp")).every((request) => request.priority === "soon")).toBe(true);
    expect(freeTimeRequests("delhi", "soon").every((request) => requests.some((item) => requestId(item) === requestId(request)))).toBe(true);
    const heroine = characterPicture("heroine", "neutral", { cityId: "delhi" })!;
    expect(priorityOf(requests, { kind: "image", key: heroine, priority: "idle" })).toBe("idle");
  });

  it("asks for the first lines of the scenes a chosen card would open, without opening them", () => {
    const before = JSON.stringify(delhiCleared);
    const ways = getTravelDestinations(delhiCleared).candidates.filter((event) => event.available)
      .flatMap((event) => (event.describedRoutes[0] ? [{ eventId: event.id, mode: event.describedRoutes[0].mode }] : []));
    expect(ways.length).toBeGreaterThan(0);
    const requests = destinationRequests(delhiCleared, ways);
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.some((request) => request.priority === "next")).toBe(false);
    expect(JSON.stringify(delhiCleared)).toBe(before);
  });
});

describe("titleRequests", () => {
  it("asks for the new journey's arrival soon at most", () => {
    const requests = titleRequests("golden_triangle");
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.some((request) => request.priority === "next")).toBe(false);
    const heroine = characterPicture("heroine", "neutral", { cityId: "delhi" })!;
    expect(requests.some((request) => request.key === heroine)).toBe(true);
  });

  it("asks for nothing for a journey that cannot start", () => {
    expect(titleRequests("no_such_journey")).toEqual([]);
  });
});
