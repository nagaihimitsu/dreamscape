import { misplacedLanguages } from "./data-language";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ownArtworkCatalogSchema } from "../src/content/own-artwork-schema";
import { contentSourcesFromTree, contentTreeFromFiles, loadContentSources } from "./content-sources";
import { checkImageRights, imageJourneyIndex, isImagePath, OWN_ARTWORK_KIND, ownArtworkByLayer } from "./image-rights";

// Every served image is a credited tourism image or listed as artwork made for
// Dreamscape by the layer that serves it (decision 32: the credits list leaves
// own artwork out, so the exclusion is explicit in data). Small content trees in
// memory (nothing below `root` exists), plus the repository's own content.

const root = path.join(path.sep, "virtual", "dreamscape");
const json = (value: unknown) => JSON.stringify(value);
const trip = "content/journeys/trip_a";
const own = (...groups: string[][]) => json({ schemaVersion: 1, artworks: groups.map((paths) => ({ noteJa: "テスト用の自作の絵", paths })) });
const asset = (assetPath: string) => ({ path: assetPath });

/** One journey (trip_a) with a tourism photo and an item icon, and the root public/ with a reaction mark and a browser icon. */
function files(): Record<string, string | null> {
  return {
    [`${trip}/manifest.json`]: json({ schemaVersion: 1, order: 10, id: "trip_a", status: "preparing", cities: [] }),
    [`${trip}/${OWN_ARTWORK_KIND}`]: own(["assets/items/ticket.svg"]),
    [`${trip}/public/assets/tourism/trip_a/spot.webp`]: null,
    [`${trip}/public/assets/items/ticket.svg`]: null,
    [`content/${OWN_ARTWORK_KIND}`]: own(["assets/effects/heart.svg"], ["favicon-16.png"]),
    "public/assets/effects/heart.svg": null,
    "public/favicon-16.png": null,
    "public/manifest.webmanifest": null,
  };
}
const load = (tree: Record<string, string | null>) => contentSourcesFromTree(contentTreeFromFiles(root, tree));
const tourism = [asset("assets/tourism/trip_a/spot.webp")];
const check = (tree: Record<string, string | null>, assets = tourism) => () => checkImageRights(load(tree), assets);

describe("image rights", () => {
  it("accepts credited tourism images and listed own artwork, and ignores served files that are not images", () => {
    expect(check(files())).not.toThrow();
    // An upper-case extension is an image too, and can be listed as such.
    expect(check({ ...files(), [`${trip}/public/assets/items/Bag.PNG`]: null })).toThrow("出典のない画像");
    expect(check({ ...files(), [`${trip}/public/assets/items/Bag.PNG`]: null,
      [`${trip}/${OWN_ARTWORK_KIND}`]: own(["assets/items/ticket.svg", "assets/items/Bag.PNG"]) })).not.toThrow();
    expect(isImagePath("manifest.webmanifest")).toBe(false);
    expect(isImagePath("assets/tourism/x.JPG")).toBe(true);
  });

  it("names an unlisted image in the root public/ and in a journey's public/, with the file to list it in", () => {
    expect(check({ ...files(), "public/assets/items/new.png": null })).toThrow(
      "出典のない画像：public/assets/items/new.png。共通の public/ には Dreamscape のために作った絵だけを置き、content/presentation/own-artwork.json に登録してください。" +
      "出典のある写真なら、旅行編の public/ に置いて tourism/catalog.json の assets に出典つきで登録します" +
      "（Image without credit: assets/items/new.png is not listed as own artwork）。");
    expect(check({ ...files(), [`${trip}/public/assets/title/trip_a.webp`]: null })).toThrow(
      `出典のない画像：${trip}/public/assets/title/trip_a.webp。出典のある写真なら ${trip}/tourism/catalog.json の assets に出典つきで登録し、` +
      `Dreamscape のために作った絵なら ${trip}/presentation/own-artwork.json に登録してください` +
      "（Image without credit: assets/title/trip_a.webp is neither a tourism asset nor listed as own artwork）。");
    // A journey without its own list: its images need one too.
    const withoutList = files();
    delete withoutList[`${trip}/${OWN_ARTWORK_KIND}`];
    expect(check(withoutList)).toThrow(`出典のない画像：${trip}/public/assets/items/ticket.svg。`);
    // An uncredited photo: the tourism catalog does not list it.
    expect(check(files(), [])).toThrow(`出典のない画像：${trip}/public/assets/tourism/trip_a/spot.webp。`);
  });

  it("accepts a layer's own artwork only from its own list", () => {
    // The core list does not cover a journey's file, nor a journey's list a root file.
    const tree = { ...files(), [`content/${OWN_ARTWORK_KIND}`]: own(["assets/effects/heart.svg"], ["favicon-16.png"], ["assets/items/ticket.svg"]),
      [`${trip}/${OWN_ARTWORK_KIND}`]: own(["favicon-16.png"]) };
    let message = "";
    try { checkImageRights(load(tree), tourism); } catch (error) { message = (error as Error).message; }
    expect(message.split("\n")).toEqual([
      `出典のない画像：${trip}/public/assets/items/ticket.svg。出典のある写真なら ${trip}/tourism/catalog.json の assets に出典つきで登録し、` +
      `Dreamscape のために作った絵なら ${trip}/presentation/own-artwork.json に登録してください` +
      "（Image without credit: assets/items/ticket.svg is neither a tourism asset nor listed as own artwork）。",
      "自作の絵の一覧にあるファイルがありません：content/presentation/own-artwork.json の \"assets/items/ticket.svg\" は public/assets/items/ticket.svg にありません。" +
      "ファイルを消したり移したりしたなら、この行も直してください（Own artwork not served by its layer: assets/items/ticket.svg）。",
      `自作の絵の一覧にあるファイルがありません：${trip}/presentation/own-artwork.json の "favicon-16.png" は ${trip}/public/favicon-16.png にありません。` +
      "ファイルを消したり移したりしたなら、この行も直してください（Own artwork not served by its layer: favicon-16.png）。",
    ]);
  });

  it("refuses a stale line, an image that is both credited and own artwork, and a path listed twice", () => {
    const stale = files();
    delete stale["public/assets/effects/heart.svg"];
    expect(check(stale)).toThrow(
      "自作の絵の一覧にあるファイルがありません：content/presentation/own-artwork.json の \"assets/effects/heart.svg\" は public/assets/effects/heart.svg にありません。");
    const both = { ...files(), [`${trip}/${OWN_ARTWORK_KIND}`]: own(["assets/items/ticket.svg", "assets/tourism/trip_a/spot.webp"]) };
    expect(check(both)).toThrow(
      `画像の扱いが二重です：${trip}/public/assets/tourism/trip_a/spot.webp は出典つきの観光画像（tourism/catalog.json の assets）で、` +
      `${trip}/presentation/own-artwork.json にも自作の絵として載っています。どちらか一方にしてください` +
      "（Image both credited and listed as own artwork: assets/tourism/trip_a/spot.webp）。");
    const twice = { ...files(), [`content/${OWN_ARTWORK_KIND}`]: own(["assets/effects/heart.svg"], ["favicon-16.png", "assets/effects/heart.svg"]) };
    expect(check(twice)).toThrow(
      "自作の絵の一覧で同じファイルが2回あります：content/presentation/own-artwork.json の \"assets/effects/heart.svg\"。" +
      "1か所にまとめてください（Duplicate own artwork path: assets/effects/heart.svg）。");
  });

  it("asks nothing for a journey's album images (public/assets/album/), and refuses a credit for one", () => {
    // Dreamscape's own artwork by their folder (2026-11-11): no tourism entry, no own-artwork line.
    const withAlbum = { ...files(), [`${trip}/public/assets/album/a_tower.webp`]: null, [`${trip}/public/assets/album/01_square.png`]: null };
    expect(check(withAlbum)).not.toThrow();
    // The root public/ has no album: an image there is listed as own artwork as any other.
    expect(check({ ...files(), "public/assets/album/shared.webp": null })).toThrow("出典のない画像：public/assets/album/shared.webp。");
    // An album image never shows a credit, so the tourism catalog may not register one.
    expect(check(withAlbum, [...tourism, asset("assets/album/a_tower.webp")])).toThrow(
      `アルバムの絵に出典は付けません：${trip}/public/assets/album/a_tower.webp が tourism/catalog.json の assets に載っています。` +
      "アルバムには Dreamscape のために作った絵だけを置き、出典のある写真は assets/album/ の外に置いてください" +
      "（Album image registered as a credited tourism image: assets/album/a_tower.webp）。");
  });

  it("requires a list of the core layer's own artwork", () => {
    const tree = files();
    delete tree[`content/${OWN_ARTWORK_KIND}`];
    delete tree[`${trip}/${OWN_ARTWORK_KIND}`];
    expect(check(tree)).toThrow(`Missing content file: ${OWN_ARTWORK_KIND} (no content layer provides it)`);
  });

  it("accepts only exact served image paths in the list", () => {
    const parse = (paths: string[]) => ownArtworkCatalogSchema.safeParse({ schemaVersion: 1, artworks: [{ noteJa: "自作の絵", paths }] }).success;
    expect(parse(["assets/effects/heart.svg", "favicon-16.png", "assets/title/a.b-c_d.webp"])).toBe(true);
    // Every extension the check treats as an image, in any letter case (a served Icon.PNG must be listable).
    expect(parse(["a.png", "a.webp", "a.jpg", "a.jpeg", "a.svg", "a.gif", "a.avif", "a.ico", "assets/items/Icon.PNG", "b.JPeG"])).toBe(true);
    for (const bad of ["../public/heart.svg", "assets/../heart.svg", "/assets/heart.svg", "assets//heart.svg", "assets/.hidden/heart.svg",
      "assets/effects/", "assets/effects/heart.txt", "assets/effects/heart"])
      expect(parse([bad]), bad).toBe(false);
    expect(parse([])).toBe(false);
    expect(parse(["favicon-16.png", "favicon-16.png"])).toBe(false);
    // The note's language is content:build's data-language warning (decision 32), not a schema rule.
    const english = { schemaVersion: 1, artworks: [{ noteJa: "own art", paths: ["favicon-16.png"] }] };
    expect(ownArtworkCatalogSchema.safeParse(english).success).toBe(true);
    expect(misplacedLanguages(ownArtworkCatalogSchema, english)).toEqual([{ path: "artworks[0].noteJa", value: "own art", language: "ja" }]);
    expect(ownArtworkCatalogSchema.safeParse({ schemaVersion: 1, artworks: [{ noteJa: "自作の絵", paths: ["favicon-16.png"], extra: 1 }] }).success).toBe(false);
  });
});

describe("image journey index", () => {
  it("records which journey's tourism catalog registers each photo, in manifest and catalog order", () => {
    const tripB = "content/journeys/trip_b";
    const sources = load({
      ...files(),
      [`${trip}/tourism/catalog.json`]: json({ schemaVersion: 1, assets: [{ id: "a_spot" }, { id: "a_square" }] }),
      [`${tripB}/manifest.json`]: json({ schemaVersion: 1, order: 5, id: "trip_b", status: "preparing", cities: [] }),
      [`${tripB}/tourism/catalog.json`]: json({ schemaVersion: 1, assets: [{ id: "b_harbour" }] }),
      "content/journeys/trip_c/manifest.json": json({ schemaVersion: 1, order: 20, id: "trip_c", status: "preparing", cities: [] }),
    });
    expect(imageJourneyIndex(sources)).toEqual({ schemaVersion: 1, journeys: { trip_b: ["b_harbour"], trip_a: ["a_spot", "a_square"], trip_c: [] } });
    expect(Object.keys(imageJourneyIndex(sources).journeys)).toEqual(["trip_b", "trip_a", "trip_c"]);
  });
});

describe("the repository's images", () => {
  it("list every heroine image as own artwork, exactly once, in the core layer (decision 32)", () => {
    const sources = loadContentSources(path.resolve("."));
    const { byLayer, duplicates } = ownArtworkByLayer(sources);
    expect(duplicates).toEqual([]);
    const characters = sources.catalogs["presentation/characters.json"]!.value as {
      characters: { id: string; costumes?: { poses: { expressions: Record<string, string> }[] }[] }[];
    };
    const heroineImages = characters.characters.filter((character) => character.id === "heroine")
      .flatMap((character) => (character.costumes ?? []).flatMap((costume) => costume.poses.flatMap((pose) => Object.values(pose.expressions))));
    expect(heroineImages.length).toBeGreaterThan(0);
    const core = byLayer.get("core")!;
    for (const image of heroineImages) expect(core.has(image), image).toBe(true);
  });
});
