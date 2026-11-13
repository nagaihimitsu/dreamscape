import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MINI_GAMES } from "../registry";
import { ChoicePoint } from "./ChoicePoint";
import { MiniGameProvider, type MiniGameEnvironment } from "./MiniGameProvider";

// The host's start where the choices would be (docs/13 2.6, 6.1), for every registered game.
const environment = (change: Partial<MiniGameEnvironment> = {}): MiniGameEnvironment => ({
  auto: false, debug: false, reduceMotion: false, names: { player: "主人公", heroine: "ヒロイン" }, revision: 3,
  context: { effectIds: [], backgroundIds: [], emotionIds: [] }, onOutcome: () => true, ...change,
});
const render = (gameId: string, change: Partial<MiniGameEnvironment> = {}, ready = true) => renderToStaticMarkup(createElement(MiniGameProvider, { value: environment(change) },
  createElement(ChoicePoint, { minigame: { id: gameId, auto: MINI_GAMES[gameId].defaultAuto }, ready, cast: { heroine: null } },
    createElement("p", { "data-testid": "plain-choices" }, "choices"))));

describe.each(Object.keys(MINI_GAMES))("the host's start of %s", (gameId) => {
  const definition = MINI_GAMES[gameId];

  it("shows how to play and a start that waits for the game's file, and no choices", () => {
    const html = render(gameId);
    expect(html).toContain(definition.hintJa);
    expect(html).toContain("準備中…");
    expect(html).toMatch(/data-testid="minigame-start" disabled=""/u);
    expect(html).not.toContain("plain-choices");
    expect(html).not.toContain("minigame-debug-");
    expect(html).toContain(definition.keysJa ?? "キーボードでは遊べません");
  });

  it("offers a button per outcome in Debug mode only, and says when it plays itself", () => {
    const html = render(gameId, { debug: true });
    for (const outcome of definition.outcomes) expect(html).toContain(`data-testid="minigame-debug-${outcome.id}"`);
    expect(render(gameId, { auto: true })).toContain("おまかせで遊びます。");
  });
});

describe.each(Object.keys(MINI_GAMES).filter((id) => MINI_GAMES[id].outcomes.some((outcome) => outcome.fallback)))(
  "the host of %s, an outcome of which may be greyed", (gameId) => {
    const definition = MINI_GAMES[gameId];

    it("gives Debug's button of an outcome that cannot be taken now its fallback", () => {
      for (const outcome of definition.outcomes.filter((item) => item.fallback)) {
        const available = definition.outcomes.map((item) => item.id).filter((id) => id !== outcome.id);
        const html = render(gameId, { debug: true, available });
        expect(html).toContain(`${outcome.id} → 今は ${outcome.fallback}`);
        for (const other of available) expect(html).not.toContain(`${other} → 今は`);
      }
      expect(render(gameId, { debug: true })).not.toContain("→ 今は");
    });
  });

describe("a choice point", () => {
  it("shows the screen's own choices when the frame has no # minigame:", () => {
    const html = renderToStaticMarkup(createElement(MiniGameProvider, { value: environment() },
      createElement(ChoicePoint, { minigame: undefined, ready: true, cast: { heroine: null } }, createElement("p", { "data-testid": "plain-choices" }, "choices"))));
    expect(html).toContain("plain-choices");
  });
});
