import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MiniGameNames } from "../contract";
import type { SearchView } from "../engines/search/EnginePlay";
import { mehndiHiddenName } from "./definition";
import {
  MEHNDI_DECOYS, MEHNDI_HIT, MEHNDI_PLACES, MEHNDI_WRITING, RING_CLEAR, mehndiDecoyBox, mehndiDecoyGlyphs, mehndiDecoySize, mehndiDecoysFor, mehndiHintRing,
  mehndiMarkRing, mehndiMarks, mehndiSpotAt, mehndiVineGaps, mehndiWritingBox, mehndiWritingRing, type MehndiBox, type MehndiDecoy,
} from "./marks";
import { MEHNDI_SPOTS, MEHNDI_TARGETS, MEHNDI_TEXTS, mehndiSetup, type MehndiParams, type MehndiTarget } from "./rules";
import {
  MEHNDI_BANDS, MEHNDI_BARBS, MEHNDI_EYE, MEHNDI_FEATHER, MEHNDI_FEATHER_GAP, MEHNDI_FINE_DOTS, MEHNDI_FINGERS, MEHNDI_FLOWERS, MEHNDI_INTRICATE, MEHNDI_LEAVES,
  MEHNDI_PALM, MEHNDI_SPIRAL, MEHNDI_VINE, MEHNDI_WAVE, MEHNDI_WRIST, MEHNDI_WRIST_LINES, mehndiSkin,
} from "./Skin";
import { WRITING_ASCENT, WRITING_BASELINE, WRITING_DESCENT, WRITING_MAX_SIZE } from "./writing";

// The hidden name's field (docs/13 2.10, 2.12–2.13): the player's name in Latin letters in the Fasol SP hand (the user's
// decisions of 2026-11-16, no Japanese letters in the pattern, and 2026-11-17, the font), as text (never HTML), or no
// letters of a name at all without a Latin form; an illegible mark with no letters where the story says Hindi; the
// decorations that look like letters (2026-11-17: Fasol SP letters laid over each other, mirrored or turned, lit only),
// six places as buttons named by the pattern, and the use's art in its slots. The player's name as typed is kana here: it
// must never be drawn.
const view: SearchView = { total: 1, round: 0, searched: [], done: [], presses: {}, last: null, roundAt: 0, nudge: null, ending: null };
const field = (params: MehndiParams, latin: Pick<MiniGameNames, "playerLatin"> = { playerLatin: "Haruto" }, art: Record<string, string> = {},
  shown: SearchView = view) =>
  renderToStaticMarkup(createElement(mehndiSkin.Field, {
    params, still: false, seed: 1, cast: { heroine: null }, names: { player: "はると", heroine: "ヒロイン", ...latin }, art, sound: () => undefined,
    vibrate: () => undefined, setup: mehndiSetup(params), view: shown, live: true, search: () => undefined, active: () => undefined, frames: () => () => undefined,
  }));
/** The name's text element in the Fasol SP hand and what it says, if one is drawn. */
const lettering = (html: string) => html.match(/<text class="mg-mehndi-hidden-name-writing mg-mehndi-hidden-name-lettering"[^>]*>([^<]*)<\/text>/u);
const japanese = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
/** The field's two layers: the dark one (and what is before it), and the lit one (and what follows it). */
const layers = (html: string) => html.split("mg-mehndi-hidden-name-lit") as [string, string];
/** The runs of decorations drawn: each group's id, its attributes and its texts (their attributes and their one letter). */
const runs = (html: string) => [...html.matchAll(/<g class="mg-mehndi-hidden-name-decoy" data-decoy="([a-z_]+)"([^>]*)>(.*?)<\/g>/gu)].map((group) => ({
  id: group[1], attributes: group[2],
  texts: [...group[3].matchAll(/<text([^>]*)>([^<]*)<\/text>/gu)].map((text) => ({ attributes: text[1], letter: text[2] })),
  rest: group[3].replace(/<text[^>]*>[^<]*<\/text>/gu, ""),
}));
const DECOY_GROUP = /<g class="mg-mehndi-hidden-name-decoy"[^>]*>.*?<\/g>/gu;
/** The writings a play may have: a name, a name with no Latin form, the mark, FARHANA. */
const WRITINGS: { text: MehndiParams["text"]; latin: string | null }[] = [
  { text: "player", latin: "Taichi" }, { text: "player", latin: null }, { text: "illegible", latin: "Taichi" }, { text: "farhana", latin: "Taichi" },
];

describe("the hidden name's field", () => {
  it("writes the player's name in Latin letters in the Fasol SP hand, never the name as typed", () => {
    const html = field({ target: "thumb", text: "player" }, { playerLatin: "Taichi" });
    expect(html).toContain('class="mg-mehndi-hidden-name"');
    const writing = lettering(html);
    expect(writing?.[1]).toBe("Taichi");
    expect(writing?.[0]).not.toMatch(japanese);
    // A short name at the largest size, unpressed (only a long one is pressed to its room), its small letters centred on
    // the place (the baseline 0.18 of the size under it).
    expect(writing?.[0]).toContain('font-size="16"');
    expect(writing?.[0]).toContain('y="2.88"');
    expect(writing?.[0]).not.toContain("textLength");
    expect(html).not.toContain("はると");
    for (const target of ["peacock", "vine"] as const) expect(lettering(field({ target, text: "player" }, { playerLatin: "Taichi" }))?.[1], target).toBe("Taichi");
    // A long name only ever pressed narrower, to the room (the thumb's 52 units), at the smallest size.
    const long = lettering(field({ target: "thumb", text: "player" }, { playerLatin: "Alexandria Konstantinopoulou" }))?.[0];
    expect(long).toContain('font-size="6"');
    expect(long).toContain(`textLength="${MEHNDI_WRITING.thumb.width}"`);
    expect(long).toContain('lengthAdjust="spacingAndGlyphs"');
    // A hyphen or an apostrophe stays in the name (the stylesheet leaves it to the fallback, never the demo's advert).
    for (const name of ["Jan-Poru", "O'Brien"]) expect(lettering(field({ target: "vine", text: "player" }, { playerLatin: name }))?.[1], name).toBe(name.replace("'", "&#x27;"));
  });

  it("writes the Latin name as text, never as HTML", () => {
    const html = field({ target: "thumb", text: "player" }, { playerLatin: "<b>Haru</b>" });
    expect(lettering(html)?.[1]).toBe("&lt;b&gt;Haru&lt;/b&gt;");
    expect(html).not.toContain("<b>");
  });

  it("draws the letterless mark at the target when the name has no Latin form (no letters of a name, of any script)", () => {
    // null, or left out of the names.
    for (const latin of [{ playerLatin: null }, {}]) {
      const html = field({ target: "thumb", text: "player" }, latin);
      expect(lettering(html)).toBeNull();
      const lit = layers(html)[1];
      expect(lit).toContain("mg-mehndi-hidden-name-mark");
      // The only text drawn is the decorations': one small letter of the font a text, each in a run's group.
      expect(lit).not.toMatch(/<text[^>]*class=/u);
      expect(lit.replace(DECOY_GROUP, "")).not.toMatch(/<text/u);
      for (const run of runs(lit)) for (const text of run.texts) expect(text.letter, run.id).toMatch(/^[a-z]$/u);
      expect(html).not.toContain("はると");
      expect(html).not.toMatch(/[ऀ-ॿ]/u);
    }
  });

  it("draws an illegible mark with no letters where the story says Hindi, and FARHANA over unreadable marks", () => {
    const illegible = field({ target: "peacock", text: "illegible" });
    expect(illegible).toContain("mg-mehndi-hidden-name-mark");
    expect(illegible).not.toContain("Haruto");
    expect(illegible).not.toMatch(/[ऀ-ॿ]/u);
    const farhana = field({ target: "vine", text: "farhana" });
    expect(farhana).toContain(">FARHANA<");
    // FARHANA keeps its own letters (the story's Latin capitals), not the player's name's hand.
    expect(farhana).not.toContain("mg-mehndi-hidden-name-lettering");
    // Her number is a row of marks: no digits are written.
    expect(farhana).not.toMatch(/>[^<]*\d[^<]*</u);
  });

  it("names the six places by the pattern there, never by what hides in it", () => {
    const html = field({ target: "vine", text: "farhana" });
    for (const label of ["人差し指の花", "小指の側の花", "孔雀の羽の付け根", "親指の付け根の蔓", "真ん中の蔓", "手首の模様"]) expect(html).toContain(`aria-label="${label}"`);
    expect(html).not.toMatch(/aria-label="[^"]*(文字|名前)/u);
    // The decorations are part of the picture: six buttons, and the lit pattern hidden from the screen reader.
    expect(html.match(/<button /gu)).toHaveLength(6);
    expect(html).toContain('<div class="mg-mehndi-hidden-name-lit" aria-hidden="true">');
  });

  it("rings each wrong place pointed at while the look goes on, and the writing once the player found it", () => {
    const thumb: MehndiParams = { target: "thumb", text: "player" };
    const looking = field(thumb, undefined, {}, { ...view, searched: [0, 2, 5] });
    expect(looking.match(/mg-mehndi-hidden-name-mark-ring" data-wrong="true"/gu)).toHaveLength(3);
    expect(looking).not.toContain("data-writing");
    const found = field(thumb, undefined, {}, { ...view, searched: [0, 2, 3], ending: { kind: "found", spot: 3, misses: 2, helped: 0 } });
    expect(found.match(/data-wrong="true"/gu)).toHaveLength(2);
    expect(found).toContain("data-writing");
    // The wrong places' rings stay round the places pointed at (the index finger's flower here: 204, 104 of 300 × 420): a
    // place pointed at by 「おまかせ」 or a key, at the stylesheet's width (a decoration pointed at by hand is ringed round
    // itself: marks.test.ts).
    expect(found).toMatch(/data-wrong="true" style="left:68%;top:24.76\d*%" aria-hidden/u);
    // One line for how to play, before and during the play; no line under the label (she never shows the place).
    expect(mehndiSkin.hintJa).toBe(mehndiHiddenName.hintJa);
    expect(mehndiSkin.detailJa).toBeUndefined();
    // What the player reads before the play (the start card's line) says that there are decorations that look like letters
    // (2026-11-17 review: only Debug's howToJa did); the play's line stays short (one line on a phone: a second line makes
    // the palm smaller). Neither says how to tell them (the glint) nor what is written (a name).
    expect(mehndiHiddenName.goalJa).toBe("指でなぞって灯りを動かし、模様にまぎれた文字を見つけて押す（文字に似せた飾りもある）");
    expect(mehndiHiddenName.hintJa).toBe("なぞって灯りを動かし、模様にまぎれた文字を押す");
    for (const text of [mehndiHiddenName.goalJa!, mehndiHiddenName.hintJa]) expect(text).not.toMatch(/光|名前/u);
    expect(mehndiHiddenName.howToJa).toContain("文字に似せた飾り");
  });

  it("rings the writing found round the writing itself, all of its room with its tall strokes and tails, at every target", () => {
    for (const target of ["thumb", "peacock", "vine"] as const) {
      const ring = mehndiWritingRing(target);
      const spot = MEHNDI_SPOTS.indexOf(target);
      const html = field({ target, text: "player" }, { playerLatin: "Masayoshi" }, {}, { ...view, searched: [spot], ending: { kind: "found", spot, misses: 0, helped: 0 } });
      // The ring's place and size (in the palm's share: 300 × 420 units, the width in cqw of the palm).
      const style = html.match(/data-writing="true" aria-hidden="true" style="left:([\d.]+)%;top:([\d.]+)%;width:([\d.]+)cqw"/u);
      expect(style, target).not.toBeNull();
      expect(Number(style![1]), target).toBeCloseTo((ring.x / 300) * 100, 3);
      expect(Number(style![2]), target).toBeCloseTo((ring.y / 420) * 100, 3);
      expect(Number(style![3]), target).toBeCloseTo((ring.diameter / 300) * 100, 1);
      // Centred on the writing: its transform's translate.
      const writing = html.match(/mg-mehndi-hidden-name-lettering" transform="translate\(([\d.]+) ([\d.]+)\) rotate\((-?[\d.]+)\)"/u);
      expect([Number(writing![1]), Number(writing![2])], target).toEqual([ring.x, ring.y]);
      // Every corner of the name's room (a long name is pressed to its width) at the largest size lies inside the ring, a
      // few units clear of its line (the slant turns the room about the ring's centre).
      const half = MEHNDI_WRITING[target].width / 2;
      for (const y of [(WRITING_BASELINE - WRITING_ASCENT) * WRITING_MAX_SIZE, (WRITING_BASELINE + WRITING_DESCENT) * WRITING_MAX_SIZE])
        for (const x of [-half, half]) expect(Math.hypot(x, y), `${target} ${x} ${y}`).toBeLessThanOrEqual(ring.diameter / 2 - 3);
    }
    // At the thumb the writing lies under the spiral, apart from the place pointed at: the ring is round the writing.
    const thumb = mehndiWritingRing("thumb");
    expect(Math.hypot(thumb.x - MEHNDI_PLACES.thumb.x, thumb.y - MEHNDI_PLACES.thumb.y)).toBeGreaterThan(20);
  });

  it("draws no fine curls or leaf at the feather's base, at any target (the writing or a run of decorations lies there)", () => {
    for (const target of MEHNDI_TARGETS) for (const text of MEHNDI_TEXTS) {
      const html = field({ target, text });
      for (const gone of ["M150 262 c-8 0 -10 -8 -4 -10", "M142 246 c4 6 12 6 16 0", "M144 254 c4 4 8 4 12 0", "lookalike"]) expect(html, `${target} ${text}`).not.toContain(gone);
    }
  });

  it("draws the decorations made of Fasol SP letters, lit only, and gives the pool the tuning's size", () => {
    for (const target of MEHNDI_TARGETS) for (const { text, latin } of WRITINGS) {
      const params: MehndiParams = { target, text };
      const html = field(params, { playerLatin: latin });
      const [dark, lit] = layers(html);
      const label = `${target} ${text} ${latin}`;
      const expected = mehndiDecoysFor(target);
      const drawn = runs(lit);
      // The runs of the other places, in the table's order; the dark shows none of them (the broad lines only).
      expect(drawn.map((run) => run.id), label).toEqual(expected.map((decoy) => decoy.id));
      expect(dark, label).not.toContain("decoy");
      expect(dark, label).not.toContain("<text");
      const size = mehndiDecoySize(params, latin);
      drawn.forEach((run, index) => {
        const decoy = expected[index];
        const fontSize = Math.round(size * decoy.scale * 100) / 100;
        // The run's own frame and size (the decorations' size times its scale).
        expect(run.attributes, `${label} ${run.id}`).toBe(` transform="translate(${decoy.x} ${decoy.y}) rotate(${decoy.rotate})" font-size="${fontSize}"`);
        expect(run.rest, `${label} ${run.id}`).toBe("");
        // One letter a text, each about its place along the run (text-anchor middle), on the baseline under the small
        // letters' middle; a mirrored one flipped about its place, a half-turned one turned about it.
        const glyphs = mehndiDecoyGlyphs(decoy);
        expect(run.texts.map((item) => item.letter), `${label} ${run.id}`).toEqual(glyphs.map((glyph) => glyph.letter));
        run.texts.forEach((item, at) => {
          const x = Math.round(glyphs[at].x * fontSize * 100) / 100;
          const turn = glyphs[at].turn === "mirror" ? ` transform="matrix(-1 0 0 1 ${2 * x} 0)"` : glyphs[at].turn === "half" ? ` transform="rotate(180 ${x} 0)"` : "";
          expect(item.attributes, `${label} ${run.id} ${at}`).toBe(` x="${x}" y="${Math.round(fontSize * WRITING_BASELINE * 100) / 100}" text-anchor="middle"${turn}`);
        });
      });
      // The writing is one element, and the only one that glints: no run has the writing's class or the name's.
      expect(html.match(/class="mg-mehndi-hidden-name-writing[ "]/gu), label).toHaveLength(1);
      expect(html.match(/mg-mehndi-hidden-name-lettering/gu) ?? [], label).toHaveLength(text === "player" && latin ? 1 : 0);
      // The name is written once, in the name's element, and no run spells it.
      if (text === "player" && latin) {
        expect(html.split(`>${latin}<`), label).toHaveLength(2);
        expect(lettering(html)?.[1], label).toBe(latin);
      } else expect(html, label).not.toContain("Taichi");
      expect(html, label).not.toContain("はると");
    }
    // A long name's decorations are as small as the name, never smaller than reads as letters.
    const long = runs(field({ target: "thumb", text: "player" }, { playerLatin: "Alexandria Konstantinopoulou" }));
    expect(long.find((run) => run.id === "feather_base")?.attributes).toContain('font-size="9"');
    expect(long.find((run) => run.id === "ring_finger")?.attributes).toContain('font-size="7.65"');
    expect(field({ target: "thumb", text: "player" })).toContain("--mehndi-lamp-r:max(8cqw, 18px)");
  });

  it("breaks the central vine's line behind the two things laid on it (the writing or a run), in the lit pattern only", () => {
    for (const target of MEHNDI_TARGETS) for (const { text, latin } of WRITINGS) {
      const [dark, lit] = layers(field({ target, text }, { playerLatin: latin }));
      const label = `${target} ${text} ${latin}`;
      expect(dark, label).not.toContain("vinegap");
      const mask = lit.match(/<mask id="([a-zA-Z0-9]*vinegap)"[^>]*>(.*?)<\/mask>/u);
      expect(mask, label).not.toBeNull();
      // The whole palm shown but two rounded boxes: mehndiVineGaps', each in its thing's own frame (rounded as drawn).
      const round = (value: number) => Math.round(value * 100) / 100;
      expect(mask![2], label).toBe(`<rect width="300" height="420" fill="#fff"></rect>${mehndiVineGaps(target).map(({ x, y, rotate, rect }) =>
        `<rect x="${round(rect.x)}" y="${round(rect.y)}" width="${round(rect.width)}" height="${round(rect.height)}" rx="4" fill="#000" stroke="none" transform="translate(${x} ${y}) rotate(${rotate})"></rect>`).join("")}`);
      // Only the vine's line is cut by it.
      expect(lit.split(`mask="url(#${mask![1]})"`), label).toHaveLength(2);
      expect(lit, label).toContain(`<path d="${MEHNDI_VINE}" mask="url(#${mask![1]})"></path>`);
    }
  });

  it("loads the font's stylesheet with the play only: the definition (on the title page) imports no stylesheet or font file", () => {
    const definition = readFileSync(new URL("./definition.ts", import.meta.url), "utf8");
    expect([...definition.matchAll(/^import .*$/gmu)].map((line) => line[0])).toEqual(['import { z } from "zod";', 'import { defineMiniGame } from "../contract";']);
    expect(definition).not.toMatch(/\.css|\.otf|@font-face/u);
    expect(readFileSync(new URL("./Skin.tsx", import.meta.url), "utf8")).toContain('import "./skin.css";');
    // The decorations take the name's font, weight and colour from the stylesheet (one rule for the two; the same fill).
    const css = readFileSync(new URL("./skin.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.mg-mehndi-hidden-name-lettering, \.mg-mehndi-hidden-name-decoy \{\s*font-family: "Fasol SP Demo", "Noto Sans JP", sans-serif;\s*font-weight: var\(--ds-weight-regular\);/u);
    // A colour is named once at the stylesheet's head (docs/14 「デザインの決まり」): a fill resolves through its name.
    const named = (value: string | undefined) => {
      const name = value?.match(/^var\((--[\w-]+)\)$/u)?.[1];
      return name ? css.match(new RegExp(`${name}: (#[0-9a-f]{6});`, "u"))?.[1] : value;
    };
    const fill = (selector: string) => named(css.match(new RegExp(`\\.${selector} \\{ fill: ([^;]+);`, "u"))?.[1]);
    expect(fill("mg-mehndi-hidden-name-decoy")).toBe("#7a3010");
    expect(fill("mg-mehndi-hidden-name-writing")).toBe(fill("mg-mehndi-hidden-name-decoy"));
    // Only the writing glints; with less motion (no animation runs then) only the writing keeps a steady sheen.
    expect(css).not.toMatch(/-decoy[^{]*\{[^}]*(?:animation|filter)/u);
    const sheen = css.match(/:is\(\[data-still\], \.reduce-motion\) \.mg-mehndi-hidden-name-writing \{ filter: ([^;]+); \}/u)?.[1];
    expect(sheen).toMatch(/^drop-shadow\(.+\) brightness\(1\.\d+\)$/u);
    expect(css).toContain(`@media (prefers-reduced-motion: reduce) {\n  .mg-mehndi-hidden-name-writing { filter: ${sheen}; }\n}`);
  });

  it("puts the use's pictures in its declared slots, the writing and the decorations over the palm's", () => {
    expect(mehndiHiddenName.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["palm", "sprite"], ["lamp", "sprite"]]);
    const html = field({ target: "thumb", text: "player" }, undefined, { palm: "/assets/minigames/palm.webp", lamp: "/assets/minigames/lamp.webp" });
    expect(html).toContain('src="/assets/minigames/palm.webp"');
    expect(html).toContain('src="/assets/minigames/lamp.webp"');
    // The writing and the decorations are the game's, over the picture (lit only); the drawn hand's fine lines are not.
    expect(html).toContain(">Haruto<");
    const [dark, lit] = layers(html);
    expect(runs(lit).map((run) => run.id)).toEqual(mehndiDecoysFor("thumb").map((decoy) => decoy.id));
    expect(dark).not.toContain("decoy");
    expect(html).not.toContain("mg-mehndi-hidden-name-fine");
    expect(html).not.toContain("vinegap");
  });
});

// The geometry of the hand, from the shapes the field draws (Skin.tsx exports them), in the hand's units (300 × 420).
type Point = [number, number];
/** A thing with a frame of its own on the palm: its centre and its slant. */
type Frame = { x: number; y: number; rotate: number };
/**
 * A path's lines, one list of points for each of its subpaths (M, L, H, C, Q and Z, and the relative m, l and c, as the
 * hand's are drawn), its curves sampled about every 0.1 unit.
 */
const pathLines = (d: string): Point[][] => {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/gu) ?? [];
  const lines: Point[][] = [];
  let line: Point[] = [];
  let command = "";
  let at: Point = [0, 0];
  let start: Point = [0, 0];
  const curve = (points: Point[]) => {
    for (let step = 1; step <= 1000; step += 1) {
      const t = step / 1000;
      const u = 1 - t;
      const weights = points.length === 4 ? [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t] : [u * u, 2 * u * t, t * t];
      line.push([weights.reduce((sum, weight, index) => sum + weight * points[index][0], 0), weights.reduce((sum, weight, index) => sum + weight * points[index][1], 0)]);
    }
    at = points[points.length - 1];
  };
  for (let index = 0; index < tokens.length;) {
    if (/^[A-Za-z]$/u.test(tokens[index])) command = tokens[index++];
    if (command === "Z") {
      line.push(start);
      at = start;
      if (index < tokens.length && !/^[A-Za-z]$/u.test(tokens[index])) throw new Error(`numbers after Z in ${d}`);
      continue;
    }
    const relative = command === command.toLowerCase();
    const take = (count: number): Point[] => {
      const values = tokens.slice(index, (index += count)).map(Number);
      return Array.from({ length: count / 2 }, (_, pair): Point => [values[pair * 2] + (relative ? at[0] : 0), values[pair * 2 + 1] + (relative ? at[1] : 0)]);
    };
    if (command === "M" || command === "m") {
      if (line.length) lines.push(line);
      [at] = take(2);
      start = at;
      line = [at];
      command = relative ? "l" : "L";
    } else if (command === "L" || command === "l") {
      [at] = take(2);
      line.push(at);
    } else if (command === "H") {
      at = [Number(tokens[index++]), at[1]];
      line.push(at);
    } else if (command === "C" || command === "c") curve([at, ...take(6)]);
    else if (command === "Q") curve([at, ...take(4)]);
    else throw new Error(`a path command this reader does not draw: ${command} in ${d}`);
  }
  if (line.length) lines.push(line);
  return lines;
};
/** A path's points, all its subpaths in order. */
const pathPoints = (d: string): Point[] => pathLines(d).flat();
/** Lines as points no further apart than `step` (a straight stretch filled in). */
const dense = (lines: Point[][], step = 0.2): Point[] => lines.flatMap((line) => line.flatMap((point, index): Point[] => {
  if (!index) return [point];
  const [ax, ay] = line[index - 1];
  const count = Math.max(1, Math.ceil(Math.hypot(point[0] - ax, point[1] - ay) / step));
  return Array.from({ length: count }, (_, at): Point => [ax + ((point[0] - ax) * (at + 1)) / count, ay + ((point[1] - ay) * (at + 1)) / count]);
}));
/** An ellipse's line as points (a circle with one radius). */
const ellipse = (cx: number, cy: number, rx: number, ry = rx): Point[] => Array.from({ length: 721 }, (_, index): Point => [
  cx + rx * Math.cos((index * Math.PI) / 360), cy + ry * Math.sin((index * Math.PI) / 360),
]);
/** The broad lines' and the fine lines' half widths (skin.css). */
const css = readFileSync(new URL("./skin.css", import.meta.url), "utf8");
const half = Number(css.match(/\.mg-mehndi-hidden-name-ink \{[^}]*stroke-width: ([\d.]+);/u)![1]) / 2;
const fine = Number(css.match(/\.mg-mehndi-hidden-name-fine \{[^}]*stroke-width: ([\d.]+);/u)![1]) / 2;
/** Air between what is written and a line's edge. */
const AIR = 1;
/** A point of the hand in a thing's own frame (its transform undone), and back. */
const toFrame = (frame: Frame, [x, y]: Point): Point => {
  const angle = (-frame.rotate * Math.PI) / 180;
  return [(x - frame.x) * Math.cos(angle) - (y - frame.y) * Math.sin(angle), (x - frame.x) * Math.sin(angle) + (y - frame.y) * Math.cos(angle)];
};
const toHand = (frame: Frame, [x, y]: Point): Point => {
  const angle = (frame.rotate * Math.PI) / 180;
  return [frame.x + x * Math.cos(angle) - y * Math.sin(angle), frame.y + x * Math.sin(angle) + y * Math.cos(angle)];
};
/** How far a point (in a box's own frame) is outside the box (negative: inside it). */
const outsideBox = (box: MehndiBox, [x, y]: Point) => {
  const dx = Math.max(box.left - x, x - box.right);
  const dy = Math.max(box.top - y, y - box.bottom);
  return dx <= 0 && dy <= 0 ? Math.max(dx, dy) : Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
};
/** The nearest that any of `points` (of the hand) comes to a box in `frame`: under 0, inside it. */
const nearest = (frame: Frame, box: MehndiBox, points: Point[]) => Math.min(...points.map((point) => outsideBox(box, toFrame(frame, point))));
/** A box's edge as points of the hand, every half unit (its corners among them). */
const edge = (frame: Frame, box: MehndiBox): Point[] => {
  const points: Point[] = [[box.right, box.top], [box.right, box.bottom], [box.left, box.bottom]];
  for (let x = box.left; x < box.right; x += 0.5) points.push([x, box.top], [x, box.bottom]);
  for (let y = box.top; y < box.bottom; y += 0.5) points.push([box.left, y], [box.right, y]);
  return points.map((point) => toHand(frame, point));
};
/** The writing's room at the largest size, in the writing's own frame: its width, from the tall strokes' tops to the tails' ends. */
const room = (target: MehndiTarget): MehndiBox => ({
  left: -MEHNDI_WRITING[target].width / 2, right: MEHNDI_WRITING[target].width / 2,
  top: (WRITING_BASELINE - WRITING_ASCENT) * WRITING_MAX_SIZE, bottom: (WRITING_BASELINE + WRITING_DESCENT) * WRITING_MAX_SIZE,
});
/** Whether a point is inside a closed line (even-odd). */
const inPolygon = (outline: Point[], [x, y]: Point) => {
  let within = false;
  for (let index = 0, last = outline.length - 1; index < outline.length; last = index, index += 1) {
    const [ax, ay] = outline[index];
    const [bx, by] = outline[last];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) within = !within;
  }
  return within;
};
/**
 * Whether a point is in a finger's bar as SVG draws it, `height` long from its tip (a rect whose corner radii are at most
 * half its sides: the dyed fingertip, shorter than it is wide, is an ellipse or nearly), grown by `grow`.
 */
const inFinger = (bar: (typeof MEHNDI_FINGERS)[number], height: number, point: Point, grow = 0) => {
  const [x, y] = toFrame({ x: bar.cx, y: bar.cy, rotate: bar.rotate }, point).map((value, index) => value + (index ? bar.cy : bar.cx));
  const [rx, ry] = [Math.min(bar.rx, bar.width / 2), Math.min(bar.rx, height / 2)];
  const [qx, qy] = [Math.min(Math.max(x, bar.x + rx), bar.x + bar.width - rx), Math.min(Math.max(y, bar.y + ry), bar.y + height - ry)];
  return ((x - qx) / (rx + grow)) ** 2 + ((y - qy) / (ry + grow)) ** 2 <= 1;
};
const palmOutline = pathPoints(MEHNDI_PALM);
const wristOutline = pathPoints(MEHNDI_WRIST);
/** Whether a point is on the hand (a finger, the palm or the wrist), and at least `margin` inside its edge. */
const inHand = (point: Point) => MEHNDI_FINGERS.some((bar) => inFinger(bar, bar.height, point)) || inPolygon(palmOutline, point) || inPolygon(wristOutline, point);
const inHandBy = (point: Point, margin: number) => inHand(point)
  && Array.from({ length: 24 }, (_, index) => (index * Math.PI) / 12).every((angle) => inHand([point[0] + margin * Math.cos(angle), point[1] + margin * Math.sin(angle)]));
/** What is drawn of a line where rounded boxes (each in a frame of its own) hide it: its points outside them all. */
const shownOutside = (points: Point[], gaps: { frame: Frame; rect: { x: number; y: number; width: number; height: number }; rx: number }[]) => points.filter((point) => !gaps.some(({ frame, rect, rx }) => {
  const [x, y] = toFrame(frame, point);
  const [qx, qy] = [Math.min(Math.max(x, rect.x + rx), rect.x + rect.width - rx), Math.min(Math.max(y, rect.y + rx), rect.y + rect.height - rx)];
  return Math.hypot(x - qx, y - qy) <= rx;
}));
/** The central vine, whole, and as the lit pattern shows it at a target: outside its gaps (their corners rounded by 4, as drawn). */
const wholeVine = dense(pathLines(MEHNDI_VINE));
const shownVine = (target: MehndiTarget) => shownOutside(wholeVine, mehndiVineGaps(target).map((gap) => ({ frame: gap, rect: gap.rect, rx: 4 })));
/** The feather, whole, and as the lit pattern shows it with Fasol SP letters at its base: outside the gap at its point. */
const wholeFeather = dense(pathLines(MEHNDI_FEATHER));
const shownFeather = shownOutside(wholeFeather, [{ frame: MEHNDI_WRITING.peacock, rect: MEHNDI_FEATHER_GAP, rx: 4 }]);

// Where the writing lies, measured from the shapes the field draws: every room, at the largest size with its tall strokes
// and tails, clear of the broad lines by their half width and a unit of air, inside the palm's outline, and its centre
// within a point's reach of its place. 2026-11-17: at the thumb (then slanted −22° in a room of 54 at 208, 324) the tall
// strokes of a long name ran into the spiral's last turn, and the tails out past the palm's edge; at the feather's base the
// tall strokes ran into the feather's point; in the vine's middle the vine's line came 0.7 into the room (its gap was a box
// of 32 × 25, whatever lay on it).
describe("where the writing lies", () => {
  /** The tall strokes' tops anywhere along the room (every half unit), in the hand's units. */
  const tops = (target: MehndiTarget): Point[] => {
    const box = room(target);
    return Array.from({ length: (box.right - box.left) * 2 + 1 }, (_, index) => toHand(MEHNDI_WRITING[target], [box.left + index / 2, box.top]));
  };
  const segment = (point: Point, a: Point, b: Point) => {
    const [vx, vy] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * vx + (point[1] - a[1]) * vy) / (vx * vx + vy * vy || 1)));
    return Math.hypot(point[0] - a[0] - t * vx, point[1] - a[1] - t * vy);
  };
  /** The nearest a line drawn through `points` comes to `point`, less the line's half width. */
  const clear = (point: Point, points: Point[]) => Math.min(...points.slice(1).map((b, index) => segment(point, points[index], b))) - half;

  it("lays the name at the thumb clear of the spiral: its tall strokes anywhere along the room, and all of the room", () => {
    const spiral = pathPoints(MEHNDI_SPIRAL);
    // The spiral is the one drawn (three turns, out to 20 from its centre near the thumb's place).
    expect(spiral).toHaveLength(73);
    expect(Math.max(...spiral.map(([x, y]) => Math.hypot(x - MEHNDI_PLACES.thumb.x, y - (MEHNDI_PLACES.thumb.y - 6))))).toBeCloseTo(20, 1);
    // The tops of h, k, t, l, d, b, f wherever they fall along the room, at the largest size.
    const fromTops = Math.min(...tops("thumb").map((top) => clear(top, spiral)));
    expect(fromTops).toBeGreaterThanOrEqual(AIR);
    // And no line of the spiral comes nearer the room anywhere (its corners, its sides, the tails).
    expect(nearest(MEHNDI_WRITING.thumb, room("thumb"), dense([spiral])) - half).toBeGreaterThanOrEqual(AIR);
  });

  it("hides the feather's point behind what lies at its base (lit only): the letters' tall strokes and the letterless mark's top line clear what is drawn", () => {
    const feather = pathPoints(MEHNDI_FEATHER);
    // The feather comes to its point where the peacock's place is.
    expect(feather[0]).toEqual([MEHNDI_PLACES.peacock.x, MEHNDI_PLACES.peacock.y]);
    // Drawn whole, its point lies among the tall strokes: they would run into it.
    expect(Math.min(...tops("peacock").map((top) => clear(top, feather)))).toBeLessThan(0);
    // The lit pattern masks it there for the player's name, with the gap in the writing's frame (rounded as drawn).
    const html = field({ target: "peacock", text: "player" }, { playerLatin: "Hideaki" });
    const [dark, lit] = layers(html);
    const masked = new RegExp(`<path d="${MEHNDI_FEATHER}" mask="url\\(#([^)]*feathergap)\\)"></path>`, "u");
    expect(dark).not.toMatch(masked);
    const id = lit.match(masked)?.[1];
    expect(id).toBeDefined();
    const gap = MEHNDI_FEATHER_GAP;
    const place = MEHNDI_WRITING.peacock;
    const rx = Number(lit.match(new RegExp(`<mask id="${id}"[^>]*>.*?<rect x="${gap.x}" y="${gap.y}" width="${gap.width}" height="${gap.height}" rx="([\\d.]+)" fill="#000" stroke="none" transform="translate\\(${place.x} ${place.y}\\) rotate\\(${place.rotate}\\)"></rect>`, "u"))?.[1]);
    expect(rx).toBe(4);
    // What is drawn of the feather (each point of its line outside the gap, with its full half width) clears the tall
    // strokes along the room, and the room.
    expect(shownFeather.length).toBeLessThan(wholeFeather.length);
    const from = (point: Point) => Math.min(...shownFeather.map((drawn) => Math.hypot(point[0] - drawn[0], point[1] - drawn[1]))) - half;
    expect(Math.min(...tops("peacock").map(from))).toBeGreaterThanOrEqual(AIR);
    expect(nearest(place, room("peacock"), shownFeather) - half).toBeGreaterThanOrEqual(AIR);
    // Only the point is hidden: the rest of the feather is drawn.
    const shown = new Set(shownFeather);
    const hidden = wholeFeather.filter((point) => !shown.has(point));
    expect(hidden.length).toBeGreaterThan(10);
    expect(hidden.every(([, y]) => y > MEHNDI_PLACES.peacock.y - 6)).toBe(true);
    // The same gap behind whatever lies at the feather's base, in the lit pattern only: the run of decorations there with
    // the writing elsewhere (the same frame), and the letterless mark and FARHANA there too.
    for (const target of MEHNDI_TARGETS) for (const { text, latin } of WRITINGS) {
      const [off, on] = layers(field({ target, text }, { playerLatin: latin }));
      expect(on, `${target} ${text} ${latin}`).toMatch(masked);
      expect(on.split("feathergap"), `${target} ${text} ${latin}`).toHaveLength(3);
      expect(off, `${target} ${text} ${latin}`).not.toContain("feathergap");
    }
    const run = MEHNDI_DECOYS.find((decoy) => decoy.id === "feather_base")!;
    expect([run.x, run.y, run.rotate]).toEqual([place.x, place.y, place.rotate]);
    // The letterless mark's top line (1.3 wide) lay 1.15 under the feather's uncut point (2026-11-17 review: under a pixel
    // on a small phone, it read as touching). Under the cut feather it is clear by 4 or more, and so are the mark's box
    // and FARHANA's.
    const markLine = [toHand(place, [-26, -7]), toHand(place, [26, -7])] as [Point, Point];
    const fromLine = (points: Point[]) => Math.min(...points.map((point) => segment(point, ...markLine))) - half - 1.3 / 2;
    expect(fromLine(wholeFeather)).toBeLessThan(1.2);
    expect(fromLine(shownFeather)).toBeGreaterThanOrEqual(4);
    for (const text of ["illegible", "farhana"] as const) {
      expect(nearest(place, mehndiWritingBox({ target: "peacock", text }, null), shownFeather) - half, text).toBeGreaterThanOrEqual(3);
    }
  });

  it("breaks the central vine clear of the writing laid on it: what is drawn of its line keeps off the room", () => {
    const vine = wholeVine;
    for (const target of ["peacock", "vine"] as const) {
      expect(MEHNDI_WRITING[target].onVine, target).toBe(true);
      // Whole, the vine's line runs through the room; what the lit pattern shows of it clears the room.
      expect(nearest(MEHNDI_WRITING[target], room(target), vine), target).toBeLessThan(0);
      expect(nearest(MEHNDI_WRITING[target], room(target), shownVine(target)) - half, target).toBeGreaterThanOrEqual(AIR);
    }
    // At the thumb no line runs under the room.
    expect(MEHNDI_WRITING.thumb.onVine).toBe(false);
    expect(nearest(MEHNDI_WRITING.thumb, room("thumb"), vine) - half).toBeGreaterThanOrEqual(AIR);
  });

  it("keeps every room inside the palm's outline, and its centre within a point's reach of its place", () => {
    for (const target of MEHNDI_TARGETS) {
      for (const point of edge(MEHNDI_WRITING[target], room(target))) {
        expect(inPolygon(palmOutline, point), `${target} ${point}`).toBe(true);
        // At least 1.5 inside the edge (the tails of a name ending in g, j, p, q or y at the thumb).
        expect(clear(point, palmOutline) + half, `${target} ${point}`).toBeGreaterThanOrEqual(1.5);
      }
      // A point at the writing's centre points at its place (the nearest, within reach).
      const place = MEHNDI_WRITING[target];
      expect(Math.hypot(place.x - MEHNDI_PLACES[target].x, place.y - MEHNDI_PLACES[target].y), target).toBeLessThanOrEqual(MEHNDI_HIT - 2);
      expect(mehndiSpotAt(place.x, place.y), target).toBe(MEHNDI_SPOTS.indexOf(target));
    }
  });

  it("rings her hint round the writing's room from the place to point at: all of the room inside it, and no wider", () => {
    const across: Record<MehndiTarget, number> = { thumb: 112.5, peacock: 81, vine: 89.3 };
    for (const target of MEHNDI_TARGETS) {
      const ring = mehndiHintRing(target);
      // Centred on the place to point at (the writing lies off it: 28 at the thumb).
      expect([ring.x, ring.y], target).toEqual([MEHNDI_PLACES[target].x, MEHNDI_PLACES[target].y]);
      const reach = Math.max(...edge(MEHNDI_WRITING[target], room(target)).map(([x, y]) => Math.hypot(x - ring.x, y - ring.y)));
      // Every point of the room is inside it, RING_CLEAR from its line at the farthest corner.
      expect(ring.diameter / 2 - reach, target).toBeCloseTo(RING_CLEAR, 9);
      expect(ring.diameter, target).toBeCloseTo(across[target], 1);
      // An area, not the thing: wider than the white ring round the writing found; never wider than it was (39% of the palm).
      expect(ring.diameter, target).toBeGreaterThan(mehndiWritingRing(target).diameter);
      expect(ring.diameter, target).toBeLessThanOrEqual(117);
    }
  });
});

// Where the decorations lie (2026-11-17), measured from the shapes the field draws, each run at its largest (the name's
// largest size times its scale; a smaller run lies inside that box): on the hand and off its dyed fingertips, nearest its own
// place, clear of every line drawn (by the line's half width and a unit of air), apart from the other runs, and far from
// the writing: from the place to point at for it (her hand's tell never fires on a run), from its white ring and from its room.
describe("where the decorations lie", () => {
  const boxOf = (decoy: MehndiDecoy) => mehndiDecoyBox(decoy, WRITING_MAX_SIZE * decoy.scale);
  /** The lines of the pattern (as points) and each line's half width; `only`: drawn at these targets alone. */
  const flowers = MEHNDI_FLOWERS.map(({ spot, size, ring }) => ({ ...MEHNDI_PLACES[spot], size, ring }));
  const lines: { name: string; points: Point[]; half: number; only?: MehndiTarget }[] = [
    { name: "the finger bands", points: dense(pathLines(MEHNDI_BANDS)), half },
    { name: "the wave", points: dense(pathLines(MEHNDI_WAVE)), half },
    { name: "the wrist's lines", points: dense(pathLines(MEHNDI_WRIST_LINES)), half },
    { name: "the spiral", points: dense(pathLines(MEHNDI_SPIRAL)), half },
    { name: "the feather's eye", points: ellipse(MEHNDI_EYE.cx, MEHNDI_EYE.cy, MEHNDI_EYE.rx, MEHNDI_EYE.ry), half },
    { name: "the vine's curls", points: dense(pathLines(MEHNDI_INTRICATE)), half, only: "vine" },
    { name: "the barbs", points: dense(pathLines(MEHNDI_BARBS)), half: fine },
    { name: "the leaves", points: dense(pathLines(MEHNDI_LEAVES)), half: fine },
    ...flowers.map(({ x, y, ring }) => ({ name: `the flower's ring at ${x}, ${y}`, points: ellipse(x, y, ring), half: fine })),
  ];

  it("reads the shapes as they are drawn (the paths' forms, the flowers' petals, the dots)", () => {
    expect(pathLines(MEHNDI_BANDS)).toHaveLength(5);
    expect(pathLines(MEHNDI_BARBS)).toHaveLength(6);
    expect(pathLines(MEHNDI_LEAVES)).toHaveLength(3);
    expect(pathLines(MEHNDI_INTRICATE)).toHaveLength(3);
    // A relative curve ends where its last pair says, from where it began: the first leaf, from (138, 290) by (6, 10).
    expect(pathLines(MEHNDI_LEAVES)[0][0]).toEqual([138, 290]);
    expect(pathLines(MEHNDI_LEAVES)[0].at(-1)![0]).toBeCloseTo(144, 9);
    expect(pathLines(MEHNDI_LEAVES)[0].at(-1)![1]).toBeCloseTo(300, 9);
    expect(pathLines(MEHNDI_WAVE)[0].at(-1)).toEqual([234, 210]);
    expect(pathLines(MEHNDI_VINE)[0].at(-1)).toEqual([138, 374]);
    expect(MEHNDI_FINE_DOTS).toHaveLength(16);
    expect(half).toBe(1.2);
    expect(fine).toBe(0.6);
    // The hand: a point in each finger, the palm and the wrist is on it; one beside the wrist is not.
    for (const point of [[83, 180], [122, 100], [164, 60], [205, 100], [250, 250], [150, 300], [150, 410]] as Point[]) expect(inHand(point), `${point}`).toBe(true);
    for (const point of [[60, 410], [20, 20], [150, 30], [280, 380]] as Point[]) expect(inHand(point), `${point}`).toBe(false);
    // A dyed fingertip is an ellipse, as SVG rounds a rect shorter than twice its radius: its corner is skin.
    expect(inFinger(MEHNDI_FINGERS[2], MEHNDI_FINGERS[2].tip, [164, 60])).toBe(true);
    expect(inFinger(MEHNDI_FINGERS[2], MEHNDI_FINGERS[2].tip, [147, 76])).toBe(false);
    expect(inFinger(MEHNDI_FINGERS[2], MEHNDI_FINGERS[2].height, [147, 76])).toBe(true);
  });

  it("lays every run on the hand, off the dyed fingertips, nearest its own place", () => {
    for (const decoy of MEHNDI_DECOYS) {
      for (const point of edge(decoy, boxOf(decoy))) {
        // At least 1.5 inside the hand's edge, and a unit off each dyed fingertip.
        expect(inHandBy(point, 1.5), `${decoy.id} ${point}`).toBe(true);
        for (const bar of MEHNDI_FINGERS) expect(inFinger(bar, bar.tip, point, AIR), `${decoy.id} ${point}`).toBe(false);
        // Pointing at any of it points at its place: no other place is as near.
        const own = Math.hypot(MEHNDI_PLACES[decoy.place].x - point[0], MEHNDI_PLACES[decoy.place].y - point[1]);
        for (const spot of MEHNDI_SPOTS) {
          if (spot !== decoy.place) expect(Math.hypot(MEHNDI_PLACES[spot].x - point[0], MEHNDI_PLACES[spot].y - point[1]), `${decoy.id} ${point} ${spot}`).toBeGreaterThan(own);
        }
      }
    }
  });

  it("keeps every run clear of the lines drawn with it: the broad lines, the fine lines, the flowers, the dots", () => {
    for (const target of MEHNDI_TARGETS) {
      const vine = shownVine(target);
      for (const decoy of mehndiDecoysFor(target)) {
        const label = `${target} ${decoy.id}`;
        const from = (points: Point[]) => nearest(decoy, boxOf(decoy), points);
        for (const line of lines) if (!line.only || line.only === target) expect(from(line.points) - line.half, `${label} ${line.name}`).toBeGreaterThanOrEqual(AIR);
        // A flower's petals reach 1.75 of its size from its middle (with their line); a dot is 1.4 round.
        for (const { x, y, size } of flowers) expect(from([[x, y]]) - 1.75 * size - half, `${label} the flower at ${x}, ${y}`).toBeGreaterThanOrEqual(AIR);
        expect(from(MEHNDI_FINE_DOTS.map(([x, y]): Point => [x, y])) - 1.4, `${label} the dots`).toBeGreaterThanOrEqual(AIR);
        // The central vine as shown (broken behind the two things laid on it), and the feather: whole for every run but the
        // one at its base, which lies behind the gap at the feather's point.
        expect(from(vine) - half, `${label} the vine`).toBeGreaterThanOrEqual(AIR);
        expect(from(decoy.id === "feather_base" ? shownFeather : wholeFeather) - half, `${label} the feather`).toBeGreaterThanOrEqual(AIR);
      }
    }
    // The run at the feather's base lies in the room the writing has there (its sides and its top): what clears the room clears it.
    const base = MEHNDI_DECOYS.find((decoy) => decoy.id === "feather_base")!;
    expect(boxOf(base).left).toBeGreaterThanOrEqual(room("peacock").left);
    expect(boxOf(base).right).toBeLessThanOrEqual(room("peacock").right);
    expect(boxOf(base).top).toBeGreaterThanOrEqual(room("peacock").top);
    // Whole, the vine and the feather would cross the runs laid on them.
    expect(nearest(base, boxOf(base), wholeVine)).toBeLessThan(0);
    expect(nearest(base, boxOf(base), wholeFeather) - half).toBeLessThan(AIR);
  });

  it("keeps every run far from the writing (its place, its white ring, its room) and apart from the other runs", () => {
    for (const target of MEHNDI_TARGETS) {
      const drawn = mehndiDecoysFor(target);
      const writing = MEHNDI_WRITING[target];
      const ring = mehndiWritingRing(target);
      const hint = mehndiHintRing(target);
      const marks = mehndiMarks({ target, text: "player" }, "Taichi");
      for (const decoy of drawn) {
        const label = `${target} ${decoy.id}`;
        const points = edge(decoy, boxOf(decoy));
        // Her hand's tell reaches 34 from the place to point at: never to a run (40 or more away).
        expect(Math.min(...points.map(([x, y]) => Math.hypot(x - MEHNDI_PLACES[target].x, y - MEHNDI_PLACES[target].y))), `${label} the place`).toBeGreaterThanOrEqual(40);
        // Outside the white ring round the writing found, and well off the writing's room.
        expect(Math.min(...points.map(([x, y]) => Math.hypot(x - ring.x, y - ring.y))) - ring.diameter / 2, `${label} the white ring`).toBeGreaterThanOrEqual(3);
        // Outside the dotted ring of her hint (2 or more): the area she hints holds nothing letter-like but the writing
        // (2026-11-17 review: a ring of 117 at every target took in a third of the run above the wrist at the central vine).
        expect(Math.min(...points.map(([x, y]) => Math.hypot(x - hint.x, y - hint.y))) - hint.diameter / 2, `${label} her hint's ring`).toBeGreaterThanOrEqual(2);
        expect(nearest(writing, room(target), points), `${label} the room`).toBeGreaterThanOrEqual(12);
        // The dashed ring round a run pointed at (at the name's largest size, as Taichi's) stays off the writing's room.
        const own = mehndiMarkRing(marks.find((mark) => mark.id === decoy.id)!);
        expect(outsideBox(room(target), toFrame(writing, [own.x, own.y])) - own.diameter / 2, `${label} its ring`).toBeGreaterThanOrEqual(0);
        // And 3 or more from every other run drawn with it.
        for (const other of drawn) if (other !== decoy) expect(nearest(other, boxOf(other), points), `${label} ${other.id}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
