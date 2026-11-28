import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The design's rules (2026-11-25 user decision, remade 2026-11-28; styles.css :root, docs/02 「デザインの決まり」): every
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
    if (property === "font-size" && !/^(?:var\(--[\w-]+\)|[\d.]+em|inherit|calc\(.*(?:var\(|em\b).*\))$/.test(value)) {
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
    if (property === "z-index" && /^\d{2,}$/.test(value)) wrong.push(`z-index: ${value} (a layer not named: --ds-layer-*)`);
    if (property === "font" && value !== "inherit") wrong.push(`font: ${value} (write font-family, font-size and line-height from the rules)`);
    if (property === "font-family" && !/^(?:var\(--[\w-]+\)|inherit)$/.test(value) && !ownFaces.some((face) => value.startsWith(face))) {
      wrong.push(`font-family: ${value} (not one of the rules' typefaces)`);
    }
  }
  for (const { property, value } of declarations(css.replace(KEYFRAMES, ""))) {
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
      if (!path.startsWith("src/minigames/")) wrong.push(...shadowErrors(css));
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
