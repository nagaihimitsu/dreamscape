import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The design's rules (2026-11-25 user decision; styles.css :root, docs/02 「デザインの決まり」): every stylesheet takes its
 * font sizes, line heights, corners, layers and colours from them (all stylesheets since 2026-11-26). What is a thing's
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
  for (const { property, value } of declarations(css)) {
    if (property === "font-size" && !/^(?:var\(--[\w-]+\)|[\d.]+em|inherit|calc\(.*(?:var\(|em\b).*\))$/.test(value)) {
      wrong.push(`font-size: ${value} (not a step of the type scale)`);
    }
    if (property === "line-height" && !/^(?:var\(--[\w-]+\)|1|0|normal|inherit|calc\(.*var\(.*\))$/.test(value)) {
      wrong.push(`line-height: ${value} (not one of the rules' line heights)`);
    }
    if (/^border(?:-(?:top|bottom)-(?:left|right))?-radius$/.test(property) && /(?<![\w.(-])[\d.]+px\b/.test(value.replace(/calc\([^)]*var\([^)]*\)[^)]*\)/g, ""))) {
      wrong.push(`${property}: ${value} (not one of the rules' corners)`);
    }
    if (property === "z-index" && /^\d{2,}$/.test(value)) wrong.push(`z-index: ${value} (a layer not named: --ds-layer-*)`);
  }
  return wrong;
};

describe("the design's rules", () => {
  const defined = new Set([...read("src/app/styles.css").matchAll(/(--ds-[\w-]+)\s*:/g)].map(([, name]) => name));

  it("finds the stylesheets", () => expect(STYLESHEETS.length).toBeGreaterThan(50));

  for (const path of STYLESHEETS) {
    it(`${path} takes its font sizes, line heights, corners and layers from the rules`, () => {
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
