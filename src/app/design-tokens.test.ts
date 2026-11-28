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
    if (property === "z-index" && /^\d{2,}$/.test(value)) wrong.push(`z-index: ${value} (a layer not named: --ds-layer-*)`);
    if (property === "font" && value !== "inherit") wrong.push(`font: ${value} (write font-family, font-size and line-height from the rules)`);
    if (property === "font-family" && !/^(?:var\(--[\w-]+\)|inherit)$/.test(value) && !ownFaces.some((face) => value.startsWith(face))) {
      wrong.push(`font-family: ${value} (not one of the rules' typefaces)`);
    }
  }
  return wrong;
};

describe("the design's rules", () => {
  const defined = new Set([...read("src/app/styles.css").matchAll(/(--ds-[\w-]+)\s*:/g)].map(([, name]) => name));

  it("finds the stylesheets", () => expect(STYLESHEETS.length).toBeGreaterThan(50));

  for (const path of STYLESHEETS) {
    it(`${path} takes its type, room, corners and layers from the rules`, () => {
      const css = read(path);
      const wrong = typeErrors(css);
      for (const [, name] of css.matchAll(/var\((--ds-[\w-]+)/g)) if (!defined.has(name)) wrong.push(`${name} (not defined in styles.css)`);
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
