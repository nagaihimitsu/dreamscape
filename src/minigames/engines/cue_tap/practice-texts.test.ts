import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MiniGamePlayProps } from "../../contract";
import { NO_JUICE } from "../../host/no-juice";
import { Play as clothPlay } from "../../cloth_flap/play";
import { Play as cricketPlay } from "../../cricket_batting/play";
import { Play as monkeyPlay } from "../../monkey_catch/play";

// The cue_tap skins' practice (its short, simple play: 2026-11-16) shows and reads out its own words, never the real
// play's twists (a high ball, a change of pace, the monkey's teasing, her stop, step back and leap, the boy); the real
// play keeps its own.

type AnyPlay = ComponentType<MiniGamePlayProps<{ warmup?: "yes" }, string>>;
const render = (Play: AnyPlay, practice: boolean) => renderToStaticMarkup(createElement(Play, {
  params: practice ? { warmup: "yes" } : {}, auto: null, available: [], still: false, seed: 1,
  clock: { now: () => 0, at: () => 0, onFrame: () => () => undefined, after: () => () => undefined },
  cast: { heroine: createElement("i") }, names: { player: "主人公", heroine: "ヒロイン" }, art: {},
  sound: () => undefined, vibrate: () => undefined, status: () => undefined, end: () => undefined, decided: () => undefined,
  practice, juice: NO_JUICE, react: () => undefined,
}));
/** The hint above the meter and the button's read-out (its aria-describedby). */
const texts = (html: string) => ({
  hint: /<p class="mg-cue-tap-hint">([^<]*)<\/p>/u.exec(html)?.[1] ?? "",
  readOut: /<span id="[^"]+" class="sr-only">([^<]*)<\/span>/u.exec(html)?.[1] ?? "",
});

const games: { name: string; Play: AnyPlay; twists: RegExp }[] = [
  { name: "cricket_batting", Play: cricketPlay as AnyPlay, twists: /高い球|高く跳ね上がる|速さが変わ/u },
  { name: "monkey_catch", Play: monkeyPlay as AnyPlay, twists: /からかっ|腕だけ|殻|取り返/u },
  { name: "cloth_flap", Play: clothPlay as AnyPlay, twists: /立ち止ま|一段戻|跳ん|ほかの人/u },
];

describe("cue_tap practice texts", () => {
  for (const { name, Play, twists } of games) {
    it(`${name}: practice shows and reads out none of the real play's twists; the real play keeps its words`, () => {
      const practice = texts(render(Play, true));
      const real = texts(render(Play, false));
      expect(practice.hint, name).not.toBe("");
      expect(practice.readOut, name).not.toBe("");
      expect(`${practice.hint} ${practice.readOut}`, name).not.toMatch(twists);
      expect(`${real.hint} ${real.readOut}`, name).toMatch(twists);
    });
  }
});
