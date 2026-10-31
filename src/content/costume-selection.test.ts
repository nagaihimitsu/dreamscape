import { describe, expect, it } from "vitest";
import characterData from "../../content/presentation/characters.json";
import { characterCatalogSchema, characterImage, characterPlacement, resolveCharacterCostume } from "./character-assets";

const image = (costume: string, emotion = "neutral") => `assets/test/${costume}/${emotion}.png`;
const pose = (costume: string, expressions: Record<string, string> = { neutral: image(costume) }) => ({
  id: "standing_01", canvas: { width: 1024, height: 1536 }, expressions,
});

function catalogue() {
  const original = characterCatalogSchema.parse(characterData);
  const heroine = original.characters.find((character) => character.id === "heroine")!;
  heroine.costumes = ["region_outfit", "country_outfit", "city_outfit", "scene_outfit", "empty_outfit"].map((id) => ({
    id, poses: [pose(id, id === "empty_outfit" ? {} : undefined)],
  }));
  const wardrobe = {
    regions: { south_europe: { defaultCostume: "region_outfit" } },
    countries: { IT: { region: "south_europe", costume: "country_outfit" } },
    cities: { milano: { country: "IT", costume: "city_outfit" } },
    scenes: { date_scene: { costume: "scene_outfit" } },
  };
  return { heroine, wardrobe };
}

describe("regional costume selection", () => {
  it("uses scene, city, country, then region independently of the displayed names", () => {
    const { heroine, wardrobe } = catalogue();
    expect(resolveCharacterCostume(heroine, wardrobe, { sceneId: "date_scene", cityId: "milano" })).toEqual({ costume: "scene_outfit", pose: "standing_01" });
    expect(resolveCharacterCostume(heroine, wardrobe, { cityId: "milano" })).toEqual({ costume: "city_outfit", pose: "standing_01" });
    expect(resolveCharacterCostume(heroine, wardrobe, { countryId: "IT" })).toEqual({ costume: "country_outfit", pose: "standing_01" });
    expect(resolveCharacterCostume(heroine, wardrobe, { regionId: "south_europe" })).toEqual({ costume: "region_outfit", pose: "standing_01" });
    expect(resolveCharacterCostume(heroine, wardrobe, { costume: "country_outfit", sceneId: "date_scene", cityId: "milano" })).toEqual({ costume: "country_outfit", pose: "standing_01" });
  });

  it("never changes to the legacy shy artwork when this pose only has neutral", () => {
    const { heroine, wardrobe } = catalogue();
    const outfit = resolveCharacterCostume(heroine, wardrobe, { cityId: "milano" });
    expect(heroine.variants.find((variant) => variant.emotion === "shy")?.imagePath).toBeTruthy();
    for (const emotion of ["neutral", "shy", "smile", "happy", "surprised", "worried", "serious", "teasing"]) {
      expect(characterImage(heroine, { ...outfit, emotion })).toBe(image("city_outfit"));
      expect(characterPlacement(heroine, { ...outfit, emotion })).toEqual(characterPlacement(heroine, outfit));
    }
  });

  it("uses a newly registered expression without a code change and retains its shared placement", () => {
    const { heroine, wardrobe } = catalogue();
    heroine.costumes!.find((costume) => costume.id === "city_outfit")!.poses[0].expressions.smile = image("city_outfit", "smile");
    const outfit = resolveCharacterCostume(heroine, wardrobe, { cityId: "milano" });
    expect(characterImage(heroine, { ...outfit, emotion: "smile" })).toBe(image("city_outfit", "smile"));
    expect(characterImage(heroine, { ...outfit, emotion: "shy" })).toBe(image("city_outfit"));
    expect(characterPlacement(heroine, { ...outfit, emotion: "smile" })).toEqual(characterPlacement(heroine, { ...outfit, emotion: "shy" }));
  });

  it("uses the existing placeholder if the chosen outfit has no neutral yet", () => {
    const { heroine, wardrobe } = catalogue();
    const outfit = resolveCharacterCostume(heroine, wardrobe, { costume: "empty_outfit" });
    expect(outfit).toEqual({});
    expect(characterImage(heroine, outfit)).toBeNull();
    expect(characterImage(heroine, { ...outfit, emotion: "shy" })).toBe(heroine.variants[0].imagePath);
  });

  it("keeps the existing placeholder for an unknown region and leaves other characters independent", () => {
    const { heroine, wardrobe } = catalogue();
    expect(resolveCharacterCostume(heroine, wardrobe, { cityId: "other_city" })).toEqual({});
    expect(resolveCharacterCostume({ ...heroine, id: "enemy" }, wardrobe, { cityId: "milano" })).toEqual({});
  });
});
