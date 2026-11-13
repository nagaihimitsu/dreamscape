import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MINI_GAMES } from "../../content/mini-games";
import { CRICKET_SOUNDS } from "./CricketBatting";
import { MiniGame } from "./MiniGame";

const render = (props: Partial<Parameters<typeof MiniGame>[0]> = {}) => renderToStaticMarkup(createElement(MiniGame, {
  tag: { id: "cricket_batting", auto: "over_wall" }, choices: MINI_GAMES.cricket_batting.outcomes.map((outcome, index) => ({ index, optionId: outcome.id })),
  ready: true, auto: false, debug: false, reduceMotion: false, host: null, onChoose: () => true, ...props,
}));

// A line's # minigame: on the date screen (2026-11-13): its start button where the choices would be.
describe("a mini-game's place among the choices", () => {
  it("shows the game's start button and how to play, and no choice buttons", () => {
    const html = render();
    expect(html).toContain("構える");
    expect(html).toContain(MINI_GAMES.cricket_batting.hintJa);
    expect(html).not.toContain("date-choice");
    expect(html).not.toContain("minigame-debug-");
    // Not before the line is shown and its choice guard is over.
    expect(render({ ready: false })).toMatch(/data-testid="minigame-start" disabled=""/u);
  });

  it("offers a button per outcome in Debug mode only, and says when it plays itself", () => {
    const html = render({ debug: true });
    for (const outcome of MINI_GAMES.cricket_batting.outcomes) expect(html).toContain(`data-testid="minigame-debug-${outcome.id}"`);
    expect(render({ auto: true })).toContain("おまかせで遊びます。");
  });

  it("plays only sounds the shared list registers", () => {
    const registered = (JSON.parse(readFileSync(new URL("../../../content/presentation/sounds.json", import.meta.url), "utf8")) as { sounds: { id: string }[] })
      .sounds.map((sound) => sound.id);
    for (const id of Object.values(CRICKET_SOUNDS)) expect(registered).toContain(id);
  });
});
