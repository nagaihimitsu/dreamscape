import { describe, expect, it } from "vitest";
import characterData from "../../content/presentation/characters.json";
import presentationData from "../../content/romance/presentation.json";
import { characterCatalogSchema, characterImage, characterPlacement, resolveCharacterCostume } from "./character-assets";

const image = (costume: string, emotion = "neutral") => `assets/test/${costume}/${emotion}.png`;
const pose = (costume: string, expressions: Record<string, string> = { neutral: image(costume) }) => ({
  id: "standing_01", canvas: { width: 1024, height: 1536 }, expressions,
});
const expressionIds = ["neutral", "smile", "happy", "shy", "shy_deep", "surprised", "surprised_big", "worried", "serious", "teasing", "teasing_big"];

function catalogue() {
  const original = characterCatalogSchema.parse(characterData);
  const heroine = original.characters.find((character) => character.id === "heroine")!;
  heroine.costumes = ["region_outfit", "country_outfit", "city_outfit", "scene_outfit", "empty_outfit"].map((id) => ({
    id, poses: [pose(id, id === "empty_outfit" ? {} : undefined)],
  }));
  delete heroine.defaultCostume;
  delete heroine.defaultPose;
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
    for (const emotion of expressionIds) {
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

describe("regional-independent basic costume", () => {
  function withBasic() {
    const { heroine, wardrobe } = catalogue();
    heroine.defaultCostume = "default_01";
    heroine.defaultPose = "standing_01";
    heroine.costumes!.push({ id: "default_01", poses: [pose("default_01")] });
    return { heroine, wardrobe };
  }

  it("registers the 11 specified expressions while keeping the basic outfit outside geographic mappings", () => {
    const catalog = characterCatalogSchema.parse(characterData);
    expect(catalog.expressionIds).toEqual(expressionIds);
    expect(Object.keys(presentationData.emotions)).toEqual(expect.arrayContaining(expressionIds));
    const heroine = catalog.characters.find((item) => item.id === "heroine")!;
    expect(heroine.defaultCostume).toBe("default_01");
    expect(heroine.defaultPose).toBe("standing_01");
    expect(heroine.costumes?.find((item) => item.id === "default_01")?.poses[0].canvas).toEqual({ width: 1024, height: 1536 });
    expect(Object.values(catalog.wardrobe!.regions).some((item) => item.defaultCostume === "default_01")).toBe(false);
  });

  it("uses basic neutral without a region and for an undelivered regional or scene outfit", () => {
    const { heroine, wardrobe } = withBasic();
    const selected = { costume: "default_01", pose: "standing_01" };
    expect(resolveCharacterCostume(heroine, wardrobe, {})).toEqual(selected);
    expect(resolveCharacterCostume(heroine, wardrobe, { cityId: "other_city" })).toEqual(selected);
    expect(resolveCharacterCostume(heroine, wardrobe, { costume: "empty_outfit" })).toEqual(selected);
    wardrobe.scenes.date_scene.costume = "empty_outfit";
    expect(resolveCharacterCostume(heroine, wardrobe, { sceneId: "date_scene", cityId: "milano" })).toEqual(selected);
    for (const emotion of expressionIds) {
      expect(characterImage(heroine, { ...selected, emotion })).toBe(image("default_01"));
      expect(characterPlacement(heroine, { ...selected, emotion })).toEqual(characterPlacement(heroine, selected));
    }
  });

  it("keeps a delivered regional outfit ahead of the basic outfit and uses only its own neutral", () => {
    const { heroine, wardrobe } = withBasic();
    const selection = resolveCharacterCostume(heroine, wardrobe, { cityId: "milano" });
    expect(selection).toEqual({ costume: "city_outfit", pose: "standing_01" });
    expect(characterImage(heroine, { ...selection, emotion: "shy_deep" })).toBe(image("city_outfit"));
    expect(characterImage(heroine, { ...selection, emotion: "teasing_big" })).toBe(image("city_outfit"));
  });

  it("uses a newly registered basic smile without changing code or the placement of neutral", () => {
    const { heroine, wardrobe } = withBasic();
    heroine.costumes!.find((item) => item.id === "default_01")!.poses[0].expressions.smile = image("default_01", "smile");
    const selection = resolveCharacterCostume(heroine, wardrobe, {});
    expect(characterImage(heroine, { ...selection, emotion: "smile" })).toBe(image("default_01", "smile"));
    expect(characterImage(heroine, { ...selection, emotion: "surprised_big" })).toBe(image("default_01"));
    expect(characterPlacement(heroine, { ...selection, emotion: "smile" })).toEqual(characterPlacement(heroine, { ...selection, emotion: "neutral" }));
  });

  it("uses the existing placeholder if neither the requested outfit nor basic neutral is registered", () => {
    const { heroine, wardrobe } = withBasic();
    heroine.costumes!.find((item) => item.id === "default_01")!.poses[0].expressions = {};
    expect(resolveCharacterCostume(heroine, wardrobe, { costume: "empty_outfit" })).toEqual({});
    expect(characterImage(heroine, { emotion: "shy" })).toBe(heroine.variants[0].imagePath);
  });

  it("rejects a broken reference to the basic costume or its pose", () => {
    const catalog = characterCatalogSchema.parse(characterData);
    const heroine = catalog.characters.find((item) => item.id === "heroine")!;
    heroine.defaultCostume = "missing_costume";
    expect(characterCatalogSchema.safeParse(catalog).success).toBe(false);
    heroine.defaultCostume = "default_01";
    heroine.defaultPose = "missing_pose";
    expect(characterCatalogSchema.safeParse(catalog).success).toBe(false);
  });
});
