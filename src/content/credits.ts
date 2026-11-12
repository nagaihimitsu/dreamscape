import { z } from "zod";
import imageJourneyData from "./generated/image-journeys.json";
import soundData from "./generated/content/presentation/sounds.json";
import { landmarks, presentation, tourismAssets } from "./index";
import type { Journey } from "./journey-catalog";
import { journeys } from "./journeys";
import type { LandmarkDefinition, TourismAsset } from "./tourism-schemas";
import { soundCatalogSchema, type SoundCatalog, type SoundSource } from "./sounds";

// The data of the credits list (「出典とライセンス」): the photos grouped by
// journey and kind, the sound effects' sources, the map and font lines, and the
// library licences that the production build writes. Pure functions, and photoCredits() over the
// generated content for the screen. Artwork made for Dreamscape
// (presentation/own-artwork.json) is never listed; only the note below says so.

/** How a photo is used: by a landmark (観光地), only as a scene background (背景), or not at all (その他, still served). */
export type PhotoKind = "landmark" | "background" | "other";

export const PHOTO_KIND_LABELS: Readonly<Record<PhotoKind, string>> = { landmark: "観光地", background: "背景", other: "その他" };

export type PhotoCredit = {
  asset: TourismAsset;
  /** The place the photo shows: its landmark's name, else its first background's name, else its description. */
  labelJa: string;
  /**
   * The text of the link to the original image: 「元の画像：{Commons file name}」.
   * CC 2.0–3.0 licences ask for the title of the work if supplied; the data has
   * no title, so the Commons file name stands in for it (decision D3).
   */
  sourceLinkJa: string;
};

export type JourneyPhotoCredits = {
  journeyId: string;
  nameJa: string;
  /** The journey is not playable yet; its photos are served all the same (decision D1). */
  preparing: boolean;
  count: number;
  /** e.g. 「ミラノ編（13枚）」, 「ウズベキスタン編（準備中・40枚）」. */
  headingJa: string;
  kinds: { kind: PhotoKind; labelJa: string; credits: PhotoCredit[] }[];
};

/**
 * The Commons file name of a Wikimedia Commons file page
 * (`https://commons.wikimedia.org/wiki/File:Duomo_di_Milano.jpg` →
 * `Duomo di Milano.jpg`), or null for any other URL.
 */
export function commonsFileTitle(sourceUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return null;
  }
  const match = /^\/wiki\/File:(.+)$/u.exec(url.pathname);
  if (url.hostname !== "commons.wikimedia.org" || !match) return null;
  try {
    return decodeURIComponent(match[1]).replaceAll("_", " ");
  } catch {
    return null;
  }
}

/**
 * Every served tourism photo, grouped by journey (catalog order, which is the
 * manifests' order) and inside a journey by kind (観光地, 背景, その他; the
 * first that applies). `imageJourneys` is the generated index of which journey
 * provides each asset; an asset that no journey provides is an error, since
 * its credit would be missing from the list. Journeys without photos are left out.
 */
export function groupPhotoCredits(input: {
  journeys: readonly Pick<Journey, "id" | "nameJa" | "status">[];
  tourismAssets: readonly TourismAsset[];
  landmarks: readonly Pick<LandmarkDefinition, "nameJa" | "imageAssetId">[];
  backgrounds: Readonly<Record<string, { nameJa: string; imageAssetId?: string }>>;
  imageJourneys: Readonly<Record<string, readonly string[]>>;
}): JourneyPhotoCredits[] {
  const assets = new Map(input.tourismAssets.map((asset) => [asset.id, asset]));
  const journeyOf = new Map<string, string>();
  for (const [journeyId, ids] of Object.entries(input.imageJourneys))
    for (const id of ids) {
      if (!assets.has(id)) throw new Error(`Unknown tourism asset in the image index: ${journeyId}/${id}`);
      if (journeyOf.has(id)) throw new Error(`Tourism asset in two journeys of the image index: ${id}`);
      journeyOf.set(id, journeyId);
    }
  for (const asset of input.tourismAssets)
    if (!journeyOf.has(asset.id) || !input.journeys.some((journey) => journey.id === journeyOf.get(asset.id)))
      throw new Error(`Tourism asset without a journey in the image index: ${asset.id}`);

  const landmarkName = new Map<string, string>();
  for (const landmark of input.landmarks) if (!landmarkName.has(landmark.imageAssetId)) landmarkName.set(landmark.imageAssetId, landmark.nameJa);
  const backgroundName = new Map<string, string>();
  for (const background of Object.values(input.backgrounds))
    if (background.imageAssetId && !backgroundName.has(background.imageAssetId)) backgroundName.set(background.imageAssetId, background.nameJa);
  const kindOf = (asset: TourismAsset): PhotoKind =>
    landmarkName.has(asset.id) ? "landmark" : backgroundName.has(asset.id) ? "background" : "other";
  const credit = (asset: TourismAsset): PhotoCredit => {
    const title = commonsFileTitle(asset.sourceUrl);
    return {
      asset,
      labelJa: landmarkName.get(asset.id) ?? backgroundName.get(asset.id) ?? asset.altJa,
      sourceLinkJa: title ? `元の画像：${title}` : "元の画像",
    };
  };

  return input.journeys.flatMap((journey): JourneyPhotoCredits[] => {
    const own = input.tourismAssets.filter((asset) => journeyOf.get(asset.id) === journey.id);
    if (!own.length) return [];
    const preparing = journey.status === "preparing";
    const kinds = (Object.keys(PHOTO_KIND_LABELS) as PhotoKind[])
      .map((kind) => ({ kind, labelJa: PHOTO_KIND_LABELS[kind], credits: own.filter((asset) => kindOf(asset) === kind).map(credit) }))
      .filter((group) => group.credits.length > 0);
    return [{
      journeyId: journey.id, nameJa: journey.nameJa, preparing, count: own.length,
      headingJa: `${journey.nameJa}（${preparing ? "準備中・" : ""}${own.length}枚）`, kinds,
    }];
  });
}

/** `src/content/generated/image-journeys.json` (written by content:build, scripts/image-rights.ts imageJourneyIndex). */
export const imageJourneyIndexSchema = z.object({
  schemaVersion: z.literal(1),
  journeys: z.record(z.string().min(1), z.array(z.string().min(1))),
}).strict();

/** The photo credits of the generated content (every served tourism photo), for the credits list. */
export function photoCredits(): JourneyPhotoCredits[] {
  return groupPhotoCredits({
    journeys, tourismAssets, landmarks, backgrounds: presentation.backgrounds,
    imageJourneys: imageJourneyIndexSchema.parse(imageJourneyData).journeys,
  });
}

/** The licence of a sound's source as the list names it, and its deed (none for `own`, made for Dreamscape). */
export const SOUND_LICENSE_TEXT: Readonly<Record<SoundSource["license"], { labelJa: string; url?: string }>> = {
  "CC0 1.0": { labelJa: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
  "CC BY 3.0": { labelJa: "CC BY 3.0", url: "https://creativecommons.org/licenses/by/3.0/" },
  "CC BY 4.0": { labelJa: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
  "CC BY-SA 3.0": { labelJa: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" },
  "CC BY-SA 4.0": { labelJa: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
  own: { labelJa: "自作" },
};

/** One source of the sound effects in the credits list: the work, and what the sounds made from it are for (`usesJa`). */
export type SoundCredit = { source: SoundSource; usesJa: string[] };

/**
 * The sound effects' sources that some registered sound uses, in the order of the lists (the shared one first), each
 * once (a source that two layers list is the same work: content:build checks it, scripts/sound-files.ts) with the uses
 * of its sounds, each once.
 */
export function groupSoundCredits(catalog: Pick<SoundCatalog, "sources" | "sounds">): SoundCredit[] {
  const credits = new Map<string, SoundCredit>();
  for (const source of catalog.sources) if (!credits.has(source.id)) credits.set(source.id, { source, usesJa: [] });
  for (const sound of catalog.sounds)
    for (const id of sound.sources) {
      const credit = credits.get(id);
      if (credit && !credit.usesJa.includes(sound.useJa)) credit.usesJa.push(sound.useJa);
    }
  return [...credits.values()].filter((credit) => credit.usesJa.length > 0);
}

/** The sound effects' sources of the generated content (every layer's presentation/sounds.json), for the credits list. */
export function soundCredits(): SoundCredit[] {
  return groupSoundCredits(soundCatalogSchema.parse(soundData));
}

/**
 * The libraries bundled into the production build and their licences, as
 * Vite's `build.license` writes them (`third-party-licenses.json` next to
 * index.html; production builds only).
 */
export const THIRD_PARTY_LICENSES_FILE = "third-party-licenses.json";

const thirdPartyLicensesSchema = z.array(z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  identifier: z.string().min(1),
  text: z.string().min(1),
}));
export type ThirdPartyLicense = z.infer<typeof thirdPartyLicensesSchema>[number];

/** The licence list of the production build, or null when `value` is not one (the dev server answers with its HTML page). */
export function parseThirdPartyLicenses(value: unknown): ThirdPartyLicense[] | null {
  const parsed = thirdPartyLicensesSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * The map: tiles and data from OpenStreetMap (ODbL). The map itself keeps its
 * own attribution in view (OSMF tile usage policy); the list repeats it.
 * Licence checked on https://www.openstreetmap.org/copyright (2026-11-08).
 */
export const MAP_CREDIT = {
  textJa: "地図データ © OpenStreetMap contributors（ODbL：オープンデータベースライセンス）",
  url: "https://www.openstreetmap.org/copyright",
  noteJa: "地図の表示には Leaflet を使っています。",
} as const;

/**
 * The fonts, as a courtesy (decision D4): they are loaded from Google Fonts
 * (src/app/styles.css), not shipped. Both are under the SIL Open Font License
 * 1.1 (google/fonts ofl/notosansjp and ofl/notoserifjp, checked 2026-11-08).
 */
export const FONT_CREDIT = {
  textJa: "Noto Sans JP・Noto Serif JP（SIL Open Font License 1.1）。Google Fonts から読み込んでいます。",
  links: [
    { labelJa: "Noto Sans JP", url: "https://fonts.google.com/noto/specimen/Noto+Sans+JP" },
    { labelJa: "Noto Serif JP", url: "https://fonts.google.com/noto/specimen/Noto+Serif+JP" },
    { labelJa: "SIL Open Font License", url: "https://openfontlicense.org/" },
  ],
} as const;

/**
 * The footnote of the list (decision D5): own artwork is left out on purpose, and where fact sources are
 * shown (the clue book's cards, ClueDetails, and a quiz's explanation, BattleScreen; no date screen shows
 * fact sources, only its background's image credit).
 */
export const OWN_ARTWORK_NOTE_JA =
  "Dreamscape のために作った絵（キャラクターの立ち絵・アイコンなど）は、この一覧に載せていません。" +
  "情報の出典は、手がかり帳とクイズの解説に表示しています。";

/**
 * The note of the free-time screen's 「写真の出典」 (UI step 1.5): its list rows and its backdrop show the
 * copies that content:build reduced (the rows also cropped) from the credited photo (derived-images.ts).
 * The copies keep the photo's own credit and licence; this note adds the change to `modificationJa`.
 */
export const DERIVED_PHOTO_NOTE_JA = "この画面では、写真を縮小して表示しています（一覧の写真は切り抜きもしています）。";
