import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getCityBackdrop } from "./city-backdrop";
import { derivedImagePath } from "./derived-images";
import { cityContents, getCities, getCityContent } from "./index";
import { choosePlacePhoto } from "./photo-choice";
import { getPlacePhoto } from "./place-photo";
import type { TourismAsset } from "./tourism-schemas";

// The photos of the free-time screen (UI spec §3.6 and §4.1) over the generated content.

const asset = (id: string, isPlaceholder = false) => ({ id, isPlaceholder }) as TourismAsset;

describe("place photos", () => {
  it("take the place's own photo, else the first landmark's, else the background's, skipping placeholders; the hotel only its own", () => {
    const content = {
      assets: [asset("tower"), asset("tower_draft", true), asset("square"), asset("roof")],
      landmarks: [{ id: "l_tower", imageAssetId: "tower" }, { id: "l_draft", imageAssetId: "tower_draft" }],
      backgrounds: { square_bg: { imageAssetId: "square" }, plain_bg: {} },
    };
    const place = (id: string, landmarkIds: string[] | undefined, backgroundId: string, photoAssetId?: string) => ({ id, landmarkIds, backgroundId, photoAssetId });
    expect(choosePlacePhoto(content, place("p", ["l_tower", "l_draft"], "square_bg"), "h")?.id).toBe("tower");
    expect(choosePlacePhoto(content, place("p", ["l_draft"], "square_bg"), "h")?.id).toBe("square");
    expect(choosePlacePhoto(content, place("p", undefined, "square_bg"), "h")?.id).toBe("square");
    expect(choosePlacePhoto(content, place("p", ["l_draft"], "plain_bg"), "h")).toBeNull();
    expect(choosePlacePhoto(content, place("p", ["l_tower"], "square_bg", "roof"), "h")?.id).toBe("roof");
    expect(choosePlacePhoto(content, place("p", ["l_tower"], "square_bg", "tower_draft"), "h")?.id).toBe("tower");
    expect(choosePlacePhoto(content, place("h", ["l_tower"], "square_bg"), "h")).toBeNull();
    expect(choosePlacePhoto(content, place("h", ["l_tower"], "square_bg", "roof"), "h")?.id).toBe("roof");
    expect(choosePlacePhoto(content, place("h", ["l_tower"], "square_bg", "tower_draft"), "h")).toBeNull();
  });

  it("are the registered photos of 11 of Milan's 13 places, and none for the hotel", () => {
    const photos = Object.fromEntries(getCityContent("milano").travel.places.map((place) => [place.id, getPlacePhoto("milano", place.id)?.id ?? null]));
    expect(Object.values(photos).filter(Boolean)).toHaveLength(11);
    expect(photos).toMatchObject({
      p_hotel: null, p_prada: null, p_maurizio: null,
      p_duomo: "duomo_milano_photo", p_brera: "brera_courtyard_case_photo", p_supper: "last_supper_photo",
    });
    expect(getPlacePhoto("milano", "p_unknown")).toBeNull();
  });

  it("give the India journey's inns the rooftop night view (their photoAssetId)", () => {
    for (const [cityId, hotelId] of [["delhi", "delhi_hotel_hub"], ["agra", "agra_hotel_hub"], ["jaipur", "jaipur_hotel_hub"]])
      expect(getPlacePhoto(cityId, hotelId)?.id, cityId).toBe("gt_img_hotel_rooftop_night");
  });
});

describe("city backdrops", () => {
  it("are Milan's Duomo and the sample's clock tower; the other cities show the plain background", () => {
    expect(getCityBackdrop("milano")?.id).toBe("duomo_milano_photo");
    if (cityContents.mihon) expect(getCityBackdrop("mihon")?.id).toBe("smp_img_mihon_clock_tower");
    for (const city of getCities().filter((item) => item.id !== "milano" && item.id !== "mihon")) expect(getCityBackdrop(city.id), city.id).toBeNull();
  });
});

describe("derived photo copies", () => {
  it("exist in the generated public folder for every place photo and city backdrop", () => {
    const served = (file: string) => existsSync(path.join("src/content/generated/public", file));
    const paths = getCities().flatMap((city) => [
      ...getCityContent(city.id).travel.places.flatMap((place) => {
        const photo = getPlacePhoto(city.id, place.id);
        return photo ? [derivedImagePath(photo, "card")] : [];
      }),
      ...[getCityBackdrop(city.id)].flatMap((backdrop) => (backdrop ? [derivedImagePath(backdrop, "backdrop")] : [])),
    ]);
    expect(paths).toContain("assets/derived/milano/duomo_milano_photo.backdrop.webp");
    expect(paths.filter((file) => !served(file))).toEqual([]);
  });
});
