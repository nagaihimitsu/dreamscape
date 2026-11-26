import { describe, expect, it } from "vitest";
import { compileInk } from "./ink-validation";
import { MODULES_FILE, MODULES_INK } from "./modules-ink";
import { readPlaceFile } from "./place-files";
import { placeScenes } from "./scene-table";
import { shopSceneErrors, type ShopSceneContent } from "./shop-scenes";
import type { SceneEntry } from "../src/content/scene-schemas";

// A shop's scenes (2026-11-26; `# at: shop <shop>`) and `# outfit:`: read in the shop's city; content:build stops an outfit no shop
// of the journey sells, a shop of another city and a `# then:` in a shop's scene.

const top = "INCLUDE modules.ink\n-> DONE\n";
const shops = [{ id: "smp_x_shop", cityId: "x", outfitIds: ["smp_x_coat"] }, { id: "smp_y_shop", cityId: "y", outfitIds: ["smp_y_hat"] }];
const content: ShopSceneContent = { shops, outfits: ["smp_x_coat", "smp_y_hat", "smp_x_unsold"], journeyOf: (city) => (city === "z" ? "other" : "j") };

/** The scene entries of one place file whose knots are [name, head, body]. */
function scenesOf(...knots: [name: string, head: string, body?: string][]): SceneEntry[] {
  const source = top + knots.map(([name, head, body = "x\n-> END\n"]) => `\n=== ${name} ===\n${head}${body}`).join("");
  const file = readPlaceFile("places/smp_x_shop", source);
  const compiled = compileInk(file.source, "places/smp_x_shop.ink", { [MODULES_FILE]: MODULES_INK });
  return placeScenes({ file, compiled, apCap: 12, mains: [], landmarkCity: () => "x",
    shopCity: (shopId) => shops.find((shop) => shop.id === shopId)?.cityId }).map((item) => item.entry);
}
const haggle = (outfit: string, extra = "") => `# scene: encounter\n# title: 値段\n# at: shop smp_x_shop\n# priority: -1\n# repeat: always\n${extra}`;
const buy = (outfit: string, tags = "") =>
  `* [I'll take it. # option: take # translation: それにします。]\n    # outfit: ${outfit}\n    # money: -900\n${tags}    y\n    -> END\n` +
  "* [Maybe later. # option: leave # translation: また今度。]\n    # later\n    n\n    -> END\n";

describe("a shop's scenes (2026-11-26)", () => {
  it("reads a shop's scene in the shop's city, and the outfit and the price of its choice", () => {
    const [scene] = scenesOf(["smp_x_haggle", haggle("smp_x_coat"), buy("smp_x_coat")]);
    expect(scene).toMatchObject({ id: "smp_x_haggle", kind: "encounter", cityId: "x", at: [{ shop: "smp_x_shop" }], priority: -1, repeat: "always" });
    expect(scene.options[0]).toMatchObject({ id: "take", outfit: "smp_x_coat", money: -900 });
    expect(shopSceneErrors([scene], content)).toEqual([]);
    // Another city's shop's outfit is still the journey's: it may be given here.
    expect(shopSceneErrors(scenesOf(["smp_x_haggle", haggle("smp_y_hat"), buy("smp_y_hat")]), content)).toEqual([]);
  });

  it("stops an outfit no shop of the journey sells, and a # then: in a shop's scene", () => {
    expect(shopSceneErrors(scenesOf(["smp_x_haggle", haggle("smp_x_unsold"), buy("smp_x_unsold")]), content))
      .toEqual([expect.stringContaining("# outfit: smp_x_unsold")]);
    expect(shopSceneErrors(scenesOf(["smp_x_haggle", haggle("smp_x_coat"), buy("smp_x_coat")]), { ...content, journeyOf: (city) => (city === "x" ? "j" : "other") }))
      .toEqual([]);
    expect(shopSceneErrors(scenesOf(["smp_x_haggle", haggle("smp_x_coat", "# then: move smp_x_square\n"), buy("smp_x_coat")]), content))
      .toEqual([expect.stringContaining("# then:")]);
  });

  it("refuses an unknown shop", () => {
    expect(() => scenesOf(["smp_x_haggle", "# scene: talk\n# at: shop smp_x_nowhere\n# priority: -1\n"])).toThrow(/Unknown shop/);
  });
});
