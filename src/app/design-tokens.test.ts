import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MOTION, MOTION_STAGGER } from "../components/motion";

/**
 * The design's rules (2026-11-25 user decision, remade 2026-11-28; styles.css :root, docs/14 「デザインの決まり」): every
 * stylesheet takes its font sizes, line heights, room (margins, padding, gaps: --ds-space-*, since 2026-11-28), corners,
 * layers and colours from them (all stylesheets since 2026-11-26). What is a thing's
 * own (a phone's body and corners, a game's artwork, an effect's word larger than the steps or following the screen) is
 * named once as a custom property at the head of its stylesheet and used by that name. A colour of the rules at an alpha
 * is color-mix() of its name. A part orders its own pieces with 0–9; every layer above that is a --ds-layer-*.
 */
const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Every stylesheet under src/. */
const STYLESHEETS = (readdirSync(new URL("../", import.meta.url), { recursive: true }) as string[])
  .filter((path) => path.endsWith(".css"))
  .map((path) => `src/${path.replaceAll("\\", "/")}`)
  .sort();

/** The declarations of a stylesheet: property and value (a value never holds `{`, `}` or `;`). */
const declarations = (css: string) =>
  [...css.matchAll(/([-\w]+)\s*:\s*([^;{}]+);/g)].map(([, property, value]) => ({ property, value: value.replace(/\s+/g, " ").trim() }));

const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\((?!\s*var\()/;

/** A value without its functions (calc(), env(), var(), color-mix()…), so what is left is what was written bare. */
const bareOf = (value: string) => {
  let bare = value;
  for (let before = ""; before !== bare; ) [before, bare] = [bare, bare.replace(/[a-z-]*\([^()]*\)/g, "")];
  return bare;
};
/** The positive pixel lengths written bare in a value. */
const barePixels = (value: string) => [...bareOf(value).matchAll(/(?<![\w.-])(\d*\.?\d+)px\b/g)].map(([, px]) => Number(px)).filter((px) => px > 0);
/** The layers of a value, split at its top-level commas. */
const layersOf = (value: string) => {
  const layers: string[] = [];
  let depth = 0;
  let current = "";
  for (const character of value) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      layers.push(current.trim());
      current = "";
    } else current += character;
  }
  return [...layers, current.trim()];
};
const KEYFRAMES = /@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g;
/** A light the layer is made of (a glow, a gleam, a ring of a colour): not a shadow. */
const LIGHT_LAYER = /--ds-(?:light|game-mark|glass-mark|focus|here|on-dark|action-edge|surface|field|right|wrong)|--[\w-]*-(?:fill|mark|glow|edge|line|ground|ring)\b/;

const typeErrors = (css: string) => {
  const wrong: string[] = [];
  // A typeface of a thing's own: one this stylesheet loads itself (@font-face), as a mini-game's handwriting.
  const ownFaces = [...css.matchAll(/@font-face\s*\{[^}]*font-family\s*:\s*([^;}]+)/g)].map(([, face]) => face.trim());
  for (const { property, value } of declarations(css.replace(/@font-face\s*\{[^}]*\}/g, ""))) {
    if (property === "font-size" && !/^(?:var\(--[\w-]+\)|inherit|calc\(.*var\(.*\))$/.test(value)) {
      wrong.push(`font-size: ${value} (not a step of the type scale)`);
    }
    if (property === "line-height" && !/^(?:var\(--[\w-]+\)|1|0|normal|inherit|calc\(.*var\(.*\))$/.test(value)) {
      wrong.push(`line-height: ${value} (not one of the rules' line heights)`);
    }
    if (/^border(?:-(?:top|bottom)-(?:left|right))?-radius$/.test(property) && /(?<![\w.(-])[\d.]+px\b/.test(value.replace(/calc\([^)]*var\([^)]*\)[^)]*\)/g, ""))) {
      wrong.push(`${property}: ${value} (not one of the rules' corners)`);
    }
    // The room: a step of --ds-space-* (0, a negative pull such as a bleed's, and a calc() or env() are geometry).
    if (/^(?:margin|padding)(?:-[a-z-]+)?$|^(?:row-|column-)?gap$/.test(property)) {
      let bare = value;
      for (let before = ""; before !== bare; ) [before, bare] = [bare, bare.replace(/[a-z-]*\([^()]*\)/g, "")];
      if ([...bare.matchAll(/(?<![\w.-])(\d*\.?\d+)px\b/g)].some(([, px]) => Number(px) > 0)) {
        wrong.push(`${property}: ${value} (not a step of the room: --ds-space-*)`);
      }
    }
    // The weight: one of three (a face's own @font-face is left out above).
    if (property === "font-weight" && !/^(?:var\(--ds-weight-[\w-]+\)|inherit)$/.test(value)) {
      wrong.push(`font-weight: ${value} (not one of the rules' weights: --ds-weight-*)`);
    }
    // The letter spacing: one of four, or none (a negative pull that sets two marks together is geometry).
    if (property === "letter-spacing" && !/^(?:var\(--ds-tracking-\d\)|0|normal|inherit|-[\d.]+em)$/.test(value)) {
      wrong.push(`letter-spacing: ${value} (not one of the rules' letter spacings: --ds-tracking-*)`);
    }
    // An edge's width (a border, an outline): one of four; a wider one is a shape's geometry (a triangle, a frame).
    if (/^(?:border|outline)(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-width)?$/.test(property) && barePixels(value).some((px) => px <= 8)) {
      wrong.push(`${property}: ${value} (not one of the rules' edges: --ds-edge-*)`);
    }
    // The height of a press or a row: one of three.
    if (property === "min-height" && barePixels(value).some((px) => px >= 30 && px <= 70)) {
      wrong.push(`min-height: ${value} (not one of the rules' press heights: --ds-press-*)`);
    }
    // The width of a panel, a dialog, the page: one of three (inside min() and calc() too).
    if (/^(?:max-)?width$/.test(property) && [...value.matchAll(/(?<![\w.-])(\d+)px\b/g)].some(([, px]) => Number(px) >= 500 && Number(px) <= 900)) {
      wrong.push(`${property}: ${value} (not one of the rules' widths: --ds-width-*)`);
    }
    if (property === "z-index" && /^\d{2,}$/.test(value)) wrong.push(`z-index: ${value} (a layer not named: --ds-layer-*)`);
    if (property === "font" && value !== "inherit") wrong.push(`font: ${value} (write font-family, font-size and line-height from the rules)`);
    if (property === "font-family" && !/^(?:var\(--[\w-]+\)|inherit)$/.test(value) && !ownFaces.some((face) => value.startsWith(face))) {
      wrong.push(`font-family: ${value} (not one of the rules' typefaces)`);
    }
  }
  // An icon's size: one of four.
  for (const [, selector, body] of css.replace(KEYFRAMES, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selector.includes(".icon")) continue;
    for (const { property, value } of declarations(body + ";")) {
      if (/^(?:width|height)$/.test(property) && /^\d+px$/.test(value)) wrong.push(`${property}: ${value} (an icon's size not one of the rules': --ds-icon-*)`);
    }
  }
  for (const { property, value } of declarations(css.replace(KEYFRAMES, ""))) {
    // A blur: one of three.
    if (!property.startsWith("--") && /blur\(\s*\d*\.?\d+px/.test(value)) wrong.push(`${property}: ${value} (a blur not one of the rules': --ds-blur-*)`);
    // An opacity between 0 and 1: one of four (a keyframe's steps are its motion's own).
    if (property === "opacity" && !/^(?:0|1|var\(--[\w-]+\))$/.test(value)) {
      wrong.push(`opacity: ${value} (not one of the rules' opacities: --ds-opacity-*)`);
    }
    if (property === "box-shadow") {
      for (const layer of layersOf(value)) {
        // A ring (0 0 0 and its width): its width is an edge's.
        if (/^(?:inset )?0 0 0 \d*\.?\d+px\b/.test(layer) && barePixels(layer).some((px) => px <= 8)) {
          wrong.push(`box-shadow: ${layer} (a ring's width not one of the rules' edges: --ds-edge-*)`);
        }
      }
    }
  }
  return wrong;
};

/** A value without its gradients (their stops are a curve, not a colour's alpha). */
const withoutGradients = (value: string) => {
  let bare = value;
  for (let before = ""; before !== bare; ) [before, bare] = [bare, bare.replace(/(?:repeating-)?(?:linear|radial|conic)-gradient\((?:[^()]|\([^()]*\)|\((?:[^()]|\([^()]*\))*\))*\)/g, "")];
  return bare;
};
const ALPHAS = new Set([0, 8, 16, 32, 50, 70, 88, 100]);
/** A colour's transparency (color-mix's share): one of six, with 0 and 100 (a gradient's stops and a motion's steps are theirs). */
const alphaErrors = (css: string) =>
  declarations(css.replace(KEYFRAMES, ""))
    .filter(({ property, value }) => !(property.startsWith("--") && /transparent\)\s*(?:calc\(|\d+%)/.test(value)))
    .flatMap(({ property, value }) => [...withoutGradients(value).matchAll(/color-mix\(in srgb, [^,]*? (\d+(?:\.\d+)?)%/g)]
      .filter(([, share]) => !ALPHAS.has(Number(share)))
      .map(([, share]) => `${property}: ${share}% (not one of the rules' transparencies: 8, 16, 32, 50, 70, 88)`));
/** A grey a stylesheet names for a thing of its own (not a mini-game's drawing): one of the six (--ds-gray-*), white or black. */
const greyErrors = (css: string) =>
  declarations(css)
    .filter(({ property }) => property.startsWith("--") && !property.startsWith("--ds-"))
    .flatMap(({ property, value }) => [...value.matchAll(/#([0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?\b|rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)]
      .filter(([, hex, r, g, b]) => {
        const channels = hex ? [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16)) : [r, g, b].map(Number);
        return Math.max(...channels) - Math.min(...channels) <= 16;
      })
      .map(([literal]) => `${property}: ${literal} (a grey not one of the rules': --ds-gray-*, --ds-light, --ds-shade)`));

/**
 * A motion's length and way (not a mini-game's: its timing is its play): up to 1.4 s, one of the six (--motion-*), and one
 * of the three ways (--ease-*), or linear or steps(). A longer one is a presentation's own length; under 10 ms, an instant
 * reset; inside calc(), an offset.
 */
const motionErrors = (css: string) =>
  declarations(css.replace(KEYFRAMES, ""))
    .filter(({ property }) => /^(?:transition|animation)(?:-(?:duration|delay|timing-function))?$/.test(property))
    .flatMap(({ property, value }) => {
      const bare = bareOf(value.replace(/var\([^()]*\)/g, ""));
      const wrong: string[] = [];
      for (const [, number, unit] of bare.matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g)) {
        const ms = Number(number) * (unit === "s" ? 1000 : 1);
        if (ms >= 10 && ms <= 1400) wrong.push(`${property}: ${value} (a length not one of the rules': --motion-*)`);
      }
      if (/\b(?:ease|ease-in|ease-out|ease-in-out)\b|cubic-bezier\(/.test(bareOf(value))) wrong.push(`${property}: ${value} (a way not one of the rules': --ease-*)`);
      return wrong;
    });

/** The shadows a thing casts: one of the rules' (a mini-game's drawing keeps its own, and a glow of light is not a shadow). */
const shadowErrors = (css: string) =>
  declarations(css.replace(KEYFRAMES, ""))
    .filter(({ property }) => property === "box-shadow" || property === "text-shadow")
    .flatMap(({ value }) => layersOf(value))
    .filter((layer) => !layer.startsWith("var(") && !layer.startsWith("inset") && !/^0 0 0 /.test(layer) && !LIGHT_LAYER.test(layer))
    .filter((layer) => {
      const lengths = layer.match(/^(-?\d*\.?\d+(?:px)?\s+){2}(\d*\.?\d+)px/);
      return lengths !== null && Number(lengths[2]) > 0;
    })
    .map((layer) => `${layer} (a shadow not one of the rules': --ds-shadow-*, --ds-scene-text-shadow, --ds-action-text-shadow)`);

/** The steps of a scale defined in styles.css: its custom properties with this prefix. */
const stepsOf = (root: string, prefix: string) => [...new Set([...root.matchAll(new RegExp(`(${prefix}[\\w-]*)\\s*:`, "g"))].map(([, name]) => name))];

describe("the design's rules", () => {
  // Six patterns at most of each (2026-11-28 user decision), with 0, white and black.
  it("keeps each scale to six steps at most", () => {
    const root = read("src/app/styles.css");
    expect(stepsOf(root, "--ds-text-")).toHaveLength(6);
    expect(stepsOf(root, "--ds-leading-")).toHaveLength(3);
    expect(stepsOf(root, "--ds-space-")).toHaveLength(6);
    expect(stepsOf(root, "--ds-radius-")).toHaveLength(4);
    expect(stepsOf(root, "--ds-weight-")).toHaveLength(3);
    expect(stepsOf(root, "--ds-tracking-")).toHaveLength(4);
    expect(stepsOf(root, "--ds-edge")).toHaveLength(4);
    expect(stepsOf(root, "--ds-opacity-")).toHaveLength(4);
    expect(stepsOf(root, "--ds-gray-")).toHaveLength(6);
    expect(stepsOf(root, "--ds-shadow")).toHaveLength(4);
    expect(stepsOf(root, "--ds-press").filter((name) => !name.endsWith("-shadow"))).toHaveLength(3);
    expect(stepsOf(root, "--ds-icon")).toHaveLength(4);
    expect(stepsOf(root, "--ds-width")).toHaveLength(3);
    expect(stepsOf(root, "--ds-blur")).toHaveLength(3);
  });

  it("loads one web font for the words, Noto Sans JP (2026-11-28 user decision: one typeface)", () => {
    const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
    const families = [...html.matchAll(/fonts\.googleapis\.com\/css2\?([^"']+)/g)].flatMap(([, query]) =>
      [...query.matchAll(/family=([^:&]+)/g)].map(([, family]) => decodeURIComponent(family.replaceAll("+", " "))));
    expect(families).toEqual(["Noto Sans JP"]);
  });

  it("keeps the motion's six lengths and three ways, the same in the stylesheet and the code (src/components/motion.ts)", () => {
    const root = read("src/app/styles.css");
    const lengths = Object.fromEntries([...root.matchAll(/--motion-([a-z]+):\s*(\d+)ms;/g)].map(([, name, ms]) => [name, Number(ms)]));
    const { stagger, ...steps } = lengths;
    expect(steps).toEqual({ ...MOTION });
    expect(stagger).toBe(MOTION_STAGGER);
    expect(stepsOf(root, "--ease-")).toHaveLength(3);
  });

  it("never defines a rule by itself", () => {
    const root = read("src/app/styles.css");
    const selfReferring = [...root.matchAll(/(--ds-[\w-]+)\s*:([^;]*);/g)].filter(([, name, value]) => value.includes(`var(${name})`)).map(([, name]) => name);
    expect(selfReferring).toEqual([]);
  });

  it("names every grey of the rules once, as one of the six", () => {
    const root = read("src/app/styles.css").split(/\n\}\n/)[0];
    const greys = [...root.matchAll(/(--ds-[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)].filter(([, , hex]) => {
      const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
      return Math.max(r, g, b) - Math.min(r, g, b) < 24;
    });
    // The colours that carry a meaning (a right or missed answer, the current place, an action that cannot be undone,
    // an emphasised word) are tinted, not greys.
    const meaning = /^--ds-(?:right|wrong|danger|here|emphasis)/;
    expect(greys.map(([, name]) => name).filter((name) => !meaning.test(name) && !/^--ds-(?:gray-[1-6]|light|shade)$/.test(name))).toEqual([]);
  });

  const defined = new Set([...read("src/app/styles.css").matchAll(/(--ds-[\w-]+)\s*:/g)].map(([, name]) => name));

  it("finds the stylesheets", () => expect(STYLESHEETS.length).toBeGreaterThan(50));

  for (const path of STYLESHEETS) {
    it(`${path} takes its type, room, edges, corners, shadows and layers from the rules`, () => {
      const css = read(path);
      const wrong = typeErrors(css);
      for (const [, name] of css.matchAll(/var\((--ds-[\w-]+)/g)) if (!defined.has(name)) wrong.push(`${name} (not defined in styles.css)`);
      wrong.push(...alphaErrors(css));
      if (!path.startsWith("src/minigames/")) wrong.push(...shadowErrors(css), ...greyErrors(css), ...motionErrors(css));
      expect(wrong).toEqual([]);
    });
  }

  for (const path of STYLESHEETS) {
    it(`${path} takes its colours from the rules`, () => {
      const wrong = declarations(read(path))
        .filter(({ property, value }) => !property.startsWith("--") && COLOUR_LITERAL.test(value))
        .map(({ property, value }) => `${property}: ${value} (a colour not named)`);
      expect(wrong).toEqual([]);
    });
  }
});
