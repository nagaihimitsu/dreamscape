import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The design's rules (2026-11-25 user decision; styles.css --ds-text-*, --ds-leading-* and the colour roles, docs/02
 * 「デザインの決まり」): the talk's stylesheets give every font size, line height and colour from them. A colour of a thing's
 * own (a phone's body, a letter's paper) is named once as a custom property and used by that name. Every stylesheet gives
 * its font sizes and line heights from the rules (2026-11-26); an effect's word larger than the steps, or one that follows
 * the screen, is named once at the head of its stylesheet. The other screens' stylesheets join the colour list as they
 * move to the rules.
 */
const RULED = [
  "src/features/romance/romance-scene.css",
  "src/components/dialogue-controls.css",
  "src/components/line-stage.css",
  "src/components/name-cutin.css",
  "src/components/emphasis.css",
  "src/features/journey/encounter.css",
  "src/components/dialogue-window-visibility.css",
];

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Every stylesheet under src/. */
const STYLESHEETS = (readdirSync(new URL("../", import.meta.url), { recursive: true }) as string[])
  .filter((path) => path.endsWith(".css"))
  .map((path) => `src/${path.replaceAll("\\", "/")}`)
  .sort();

/** The declarations of a stylesheet: property and value (a value never holds `{`, `}` or `;`). */
const declarations = (css: string) =>
  [...css.matchAll(/([-\w]+)\s*:\s*([^;{}]+);/g)].map(([, property, value]) => ({ property, value: value.replace(/\s+/g, " ").trim() }));

const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/;

const typeErrors = (css: string) => {
  const wrong: string[] = [];
  for (const { property, value } of declarations(css)) {
    if (property === "font-size" && !/^(?:var\(--[\w-]+\)|[\d.]+em|inherit|calc\(.*(?:var\(|em\b).*\))$/.test(value)) {
      wrong.push(`font-size: ${value} (not a step of the type scale)`);
    }
    if (property === "line-height" && !/^(?:var\(--[\w-]+\)|1|0|normal|inherit|calc\(.*var\(.*\))$/.test(value)) {
      wrong.push(`line-height: ${value} (not one of the rules' line heights)`);
    }
  }
  return wrong;
};

describe("the design's rules", () => {
  const defined = new Set([...read("src/app/styles.css").matchAll(/(--ds-[\w-]+)\s*:/g)].map(([, name]) => name));

  it("finds the stylesheets", () => expect(STYLESHEETS.length).toBeGreaterThan(RULED.length));

  for (const path of STYLESHEETS) {
    it(`${path} takes its font sizes and line heights from the rules`, () => {
      const css = read(path);
      const wrong = typeErrors(css);
      for (const [, name] of css.matchAll(/var\((--ds-[\w-]+)/g)) if (!defined.has(name)) wrong.push(`${name} (not defined in styles.css)`);
      expect(wrong).toEqual([]);
    });
  }

  for (const path of RULED) {
    it(`${path} takes its colours from the rules`, () => {
      const wrong = declarations(read(path))
        .filter(({ property, value }) => !property.startsWith("--") && COLOUR_LITERAL.test(value))
        .map(({ property, value }) => `${property}: ${value} (a colour not named)`);
      expect(wrong).toEqual([]);
    });
  }
});
