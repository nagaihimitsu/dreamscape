import { describe, expect, it } from "vitest";
import { THIRD_PARTY_LICENSES_PATH } from "../../scripts/dist-guard";
import imageJourneyData from "./generated/image-journeys.json";
import {
  commonsFileTitle,
  FONT_CREDIT,
  groupPhotoCredits,
  imageJourneyIndexSchema,
  MAP_CREDIT,
  OWN_ARTWORK_NOTE_JA,
  parseThirdPartyLicenses,
  groupVoiceCredits,
  photoCredits,
  THIRD_PARTY_LICENSES_FILE,
  voiceCredits,
} from "./credits";
import { tourismAssets } from "./index";
import { journeys } from "./journeys";
import type { TourismAsset } from "./tourism-schemas";

// The credits list (decision 32, D1, D3–D5): every served tourism photo, by
// journey and kind; own artwork is never listed. Fictional journeys and
// photos below; the last test runs over the generated content.

const asset = (id: string, sourceUrl = `https://commons.wikimedia.org/wiki/File:${id}.jpg`): TourismAsset => ({
  id, path: `assets/tourism/${id}.webp`, width: 4, height: 3, altJa: `${id}の写真`, isPlaceholder: false, sourceUrl,
  licenseName: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  creditJa: "作者・Wikimedia Commons・CC BY-SA 4.0", modificationJa: "縮小しました", checkedAt: "2026-11-08",
});
const journeyList = [
  { id: "trip_b", nameJa: "南の編", status: "preparing" as const },
  { id: "trip_a", nameJa: "北の編", status: "available" as const },
  { id: "trip_c", nameJa: "写真のない編", status: "available" as const },
];
const input = {
  journeys: journeyList,
  tourismAssets: [asset("a_tower"), asset("a_square"), asset("a_spare"), asset("b_harbour"), asset("a_gate")],
  landmarks: [{ nameJa: "北の塔", imageAssetId: "a_tower" }, { nameJa: "北の塔の上", imageAssetId: "a_tower" }],
  backgrounds: {
    a_square_evening: { nameJa: "夕方の広場", imageAssetId: "a_square" },
    a_square_night: { nameJa: "夜の広場", imageAssetId: "a_square" },
    a_tower_view: { nameJa: "塔の見える道", imageAssetId: "a_tower" },
    plain: { nameJa: "旅の余白" },
    b_harbour: { nameJa: "港", imageAssetId: "b_harbour" },
  },
  imageJourneys: { trip_a: ["a_tower", "a_square", "a_spare", "a_gate"], trip_b: ["b_harbour"], trip_c: [] },
};

describe("photo credits", () => {
  it("groups the photos by journey in catalog order, marks preparing journeys and leaves out journeys without photos", () => {
    const groups = groupPhotoCredits(input);
    expect(groups.map((group) => [group.journeyId, group.headingJa, group.preparing, group.count])).toEqual([
      ["trip_b", "南の編（準備中・1枚）", true, 1],
      ["trip_a", "北の編（4枚）", false, 4],
    ]);
  });

  it("sorts a journey's photos into 観光地, 背景 and その他 (the first that applies), labelled by the place they show", () => {
    const tripA = groupPhotoCredits(input).find((group) => group.journeyId === "trip_a")!;
    expect(tripA.kinds.map((group) => [group.labelJa, group.credits.map((credit) => [credit.asset.id, credit.labelJa])])).toEqual([
      // A landmark's photo stays 観光地 even when a background also uses it.
      ["観光地", [["a_tower", "北の塔"]]],
      ["背景", [["a_square", "夕方の広場"]]],
      // Not used by any landmark or background, but served: listed with its description.
      ["その他", [["a_spare", "a_spareの写真"], ["a_gate", "a_gateの写真"]]],
    ]);
  });

  it("names the original image by its Commons file name (the work title of CC 2.0–3.0)", () => {
    expect(commonsFileTitle("https://commons.wikimedia.org/wiki/File:Duomo_di_Milano_%28facciata%29.jpg")).toBe("Duomo di Milano (facciata).jpg");
    expect(commonsFileTitle("https://commons.wikimedia.org/wiki/File:%E3%83%9F%E3%83%A9%E3%83%8E_1.jpg")).toBe("ミラノ 1.jpg");
    expect(commonsFileTitle("https://example.com/dreamscape-sample")).toBeNull();
    expect(commonsFileTitle("https://commons.wikimedia.org/wiki/Category:Milan")).toBeNull();
    expect(commonsFileTitle("https://commons.wikimedia.org/wiki/File:%E3")).toBeNull();
    expect(commonsFileTitle("not a url")).toBeNull();
    const fictional = { ...input, tourismAssets: [...input.tourismAssets.slice(0, 4), asset("a_gate", "https://example.com/dreamscape-sample")] };
    const credits = groupPhotoCredits(fictional).flatMap((group) => group.kinds.flatMap((kind) => kind.credits));
    expect(credits.find((credit) => credit.asset.id === "a_tower")!.sourceLinkJa).toBe("元の画像：a tower.jpg");
    expect(credits.find((credit) => credit.asset.id === "a_gate")!.sourceLinkJa).toBe("元の画像");
  });

  it("refuses an index that leaves a served photo without a journey, names an unknown photo, or names a photo twice", () => {
    expect(() => groupPhotoCredits({ ...input, imageJourneys: { trip_a: ["a_tower", "a_square", "a_spare"], trip_b: ["b_harbour"] } }))
      .toThrow("Tourism asset without a journey in the image index: a_gate");
    expect(() => groupPhotoCredits({ ...input, imageJourneys: { ...input.imageJourneys, trip_c: ["missing"] } }))
      .toThrow("Unknown tourism asset in the image index: trip_c/missing");
    expect(() => groupPhotoCredits({ ...input, imageJourneys: { ...input.imageJourneys, trip_c: ["a_gate"] } }))
      .toThrow("Tourism asset in two journeys of the image index: a_gate");
    expect(() => groupPhotoCredits({ ...input, journeys: journeyList.slice(1) }))
      .toThrow("Tourism asset without a journey in the image index: b_harbour");
  });
});

describe("library licences", () => {
  it("reads the file that the production build writes and the dist check requires", () => {
    expect(THIRD_PARTY_LICENSES_FILE).toBe(THIRD_PARTY_LICENSES_PATH);
  });

  it("reads the licence list of the production build and nothing else", () => {
    const entry = { name: "zod", version: "4.6.7", identifier: "MIT", text: "MIT License\n\nCopyright (c) …" };
    expect(parseThirdPartyLicenses([entry])).toEqual([entry]);
    expect(parseThirdPartyLicenses([])).toEqual([]);
    // The dev server answers a missing file with its HTML page.
    expect(parseThirdPartyLicenses("<!doctype html><html></html>")).toBeNull();
    expect(parseThirdPartyLicenses({ licenses: [entry] })).toBeNull();
    expect(parseThirdPartyLicenses([{ ...entry, text: undefined }])).toBeNull();
    expect(parseThirdPartyLicenses([{ ...entry, identifier: "" }])).toBeNull();
  });
});

describe("the fixed lines of the list", () => {
  it("credit the map data, the fonts as a courtesy, and say that own artwork is left out", () => {
    expect(MAP_CREDIT.textJa).toContain("© OpenStreetMap contributors");
    expect(MAP_CREDIT.textJa).toContain("ODbL");
    expect(MAP_CREDIT.url).toBe("https://www.openstreetmap.org/copyright");
    expect(FONT_CREDIT.textJa).toContain("SIL Open Font License 1.1");
    expect(FONT_CREDIT.links.every((link) => link.url.startsWith("https://"))).toBe(true);
    // Only the places that do show fact sources are named (no date screen shows them).
    expect(OWN_ARTWORK_NOTE_JA).toBe("Dreamscape のために作った絵（キャラクターの立ち絵・アイコンなど）は、この一覧に載せていません。" +
      "情報の出典は、手がかり帳とクイズの解説に表示しています。");
  });
});

describe("the voices' credits (2026-11-13)", () => {
  const credit = { useJa: "ヒロインの声", titleJa: "音声合成 ta-TTS", author: "ta", license: "MIT License", checkedAt: "2026-11-13",
    url: "https://example.com/ta-tts" };

  it("lists each journey's voice credits under its name, in catalog order, and leaves out journeys without", () => {
    expect(groupVoiceCredits([
      { id: "ta_trip", nameJa: "ta編", voiceCredits: [credit] },
      { id: "tb_trip", nameJa: "tb編" },
      { id: "tc_trip", nameJa: "tc編", voiceCredits: [{ ...credit, useJa: "案内の声" }] },
    ])).toEqual([
      { ...credit, journeyId: "ta_trip", journeyNameJa: "ta編" },
      { ...credit, useJa: "案内の声", journeyId: "tc_trip", journeyNameJa: "tc編" },
    ]);
  });

  it("credits the Golden Triangle heroine's voices to the speech synthesis model they were made with", () => {
    expect(voiceCredits().filter((item) => item.journeyId === "golden_triangle")).toEqual([expect.objectContaining({
      useJa: "ヒロインの声", titleJa: "音声合成 Irodori-TTS v4.1-Small", author: "Aratako", license: "MIT License",
      url: "https://huggingface.co/Aratako/Irodori-TTS-v4.1-Small",
    })]);
  });
});

describe("the generated content", () => {
  it("credits every served tourism photo once, under the journey that provides it", () => {
    const index = imageJourneyIndexSchema.parse(imageJourneyData).journeys;
    const groups = photoCredits();
    const listed = groups.flatMap((group) => group.kinds.flatMap((kind) => kind.credits.map((credit) => credit.asset.id)));
    expect([...listed].sort()).toEqual(tourismAssets.map((item) => item.id).sort());
    for (const group of groups) {
      expect(group.count).toBe(index[group.journeyId].length);
      expect(group.preparing).toBe(journeys.find((journey) => journey.id === group.journeyId)!.status === "preparing");
    }
    expect(groups.map((group) => group.journeyId)).toEqual(journeys.filter((journey) => index[journey.id]?.length).map((journey) => journey.id));
    // Every photo today is a Commons file page: each link names its file.
    const credits = groups.flatMap((group) => group.kinds.flatMap((kind) => kind.credits));
    for (const credit of credits.filter((item) => item.asset.sourceUrl.startsWith("https://commons.wikimedia.org/")))
      expect(credit.sourceLinkJa, credit.asset.id).toMatch(/^元の画像：\S/u);
  });
});
