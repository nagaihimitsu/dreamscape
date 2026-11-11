import path from "node:path";
import { IMAGE_EXTENSIONS, ownArtworkCatalogSchema } from "../src/content/own-artwork-schema";
import { albumFolderLayer } from "./album-images";
import { displayPath, parseCatalog, type ContentLayer, type ContentSources } from "./content-sources";

// Rights of the served images (docs/02 「画像の出典と自作の絵」): every image
// the game serves is either a credited tourism image (tourism/catalog.json
// `assets`, with author, source, licence and modification) or artwork made
// for Dreamscape, listed one file at a time in its layer's
// presentation/own-artwork.json, which the credits list leaves out. The album
// images (a journey's public/assets/album/, album-images.ts) are Dreamscape's
// own artwork by their folder and need no list. A pure check of the loaded
// sources (no file is read).

export const OWN_ARTWORK_KIND = "presentation/own-artwork.json";

/** Whether a served path (`assets/effects/heart.svg`) is an image file. */
export function isImagePath(assetPath: string): boolean {
  return IMAGE_EXTENSIONS.includes(path.posix.extname(assetPath).toLowerCase());
}

/**
 * The layer whose public/ folder serves `file` (an absolute path from
 * ContentSources.publicFiles): a journey layer for its own public/, the core
 * layer for the root public/.
 */
export function servingLayer(sources: Pick<ContentSources, "layers">, file: string): ContentLayer {
  const journey = sources.layers.find((layer) => layer.type === "journey" && file.startsWith(path.join(layer.directory, "public") + path.sep));
  return journey ?? sources.layers.find((layer) => layer.type === "core")!;
}

/** The layer that holds a content file (journey folders sit inside the core directory: the deepest match wins). */
function layerOfFile(layers: readonly ContentLayer[], file: string): ContentLayer {
  return [...layers].sort((a, b) => b.directory.length - a.directory.length).find((layer) => file.startsWith(layer.directory + path.sep))!;
}

/**
 * The own-artwork paths of each layer (layer ID → served path → the file that
 * lists it) and the paths one layer lists twice (as error messages).
 */
export function ownArtworkByLayer(sources: Pick<ContentSources, "root" | "layers" | "catalogs">): {
  byLayer: Map<string, Map<string, string>>; duplicates: string[];
} {
  const catalog = parseCatalog(sources, ownArtworkCatalogSchema, OWN_ARTWORK_KIND);
  const files = sources.catalogs[OWN_ARTWORK_KIND]!.provenance.items.artworks ?? [];
  const byLayer = new Map<string, Map<string, string>>();
  const duplicates: string[] = [];
  catalog.artworks.forEach((group, index) => {
    const layer = layerOfFile(sources.layers, files[index]);
    const listed = byLayer.get(layer.id) ?? new Map<string, string>();
    byLayer.set(layer.id, listed);
    for (const assetPath of group.paths) {
      if (listed.has(assetPath))
        duplicates.push(`自作の絵の一覧で同じファイルが2回あります：${displayPath(sources.root, files[index])} の "${assetPath}"。` +
          `1か所にまとめてください（Duplicate own artwork path: ${assetPath}）。`);
      listed.set(assetPath, files[index]);
    }
  });
  return { byLayer, duplicates };
}

/**
 * Check the rights of every served image. Errors (one message listing every
 * problem; Japanese first, English after):
 * 1. a served image that is neither a tourism asset nor listed as own artwork
 *    by the layer that serves it (root public/ ↔ content/presentation/own-artwork.json,
 *    a journey's public/ ↔ that journey's presentation/own-artwork.json);
 * 2. an image that is both;
 * 3. a listed own-artwork path that its layer does not serve (a stale line
 *    must not cover a later file of the same name);
 * 4. a path listed twice by one layer (ownArtworkByLayer);
 * 5. an album image (a file of a journey's public/assets/album/) that the
 *    tourism catalog credits: the album shows only Dreamscape's own artwork,
 *    which never needs a list line or a credit.
 * Served files that are not images (the web app manifest) are not checked.
 */
export function checkImageRights(
  sources: Pick<ContentSources, "root" | "layers" | "catalogs" | "publicFiles">,
  tourismAssets: readonly { path: string }[],
): void {
  const { root } = sources;
  const show = (file: string) => displayPath(root, file);
  const ownFile = (layer: ContentLayer) => show(path.join(layer.directory, OWN_ARTWORK_KIND));
  const publicFolder = (layer: ContentLayer) => layer.type === "core" ? "public" : show(path.join(layer.directory, "public"));
  const { byLayer: own, duplicates } = ownArtworkByLayer(sources);
  const credited = new Set(tourismAssets.map((asset) => path.posix.normalize(asset.path)));
  const errors: string[] = [...duplicates];

  for (const [assetPath, file] of sources.publicFiles) {
    if (!isImagePath(assetPath)) continue;
    if (albumFolderLayer(sources, file)) {
      if (credited.has(assetPath))
        errors.push(`アルバムの絵に出典は付けません：${show(file)} が tourism/catalog.json の assets に載っています。アルバムには Dreamscape のために作った絵だけを置き、` +
          `出典のある写真は assets/album/ の外に置いてください（Album image registered as a credited tourism image: ${assetPath}）。`);
      continue;
    }
    const layer = servingLayer(sources, file);
    const listedBy = own.get(layer.id)?.get(assetPath);
    if (credited.has(assetPath) && listedBy)
      errors.push(`画像の扱いが二重です：${show(file)} は出典つきの観光画像（tourism/catalog.json の assets）で、${show(listedBy)} にも自作の絵として載っています。` +
        `どちらか一方にしてください（Image both credited and listed as own artwork: ${assetPath}）。`);
    else if (!credited.has(assetPath) && !listedBy)
      errors.push(layer.type === "core"
        ? `出典のない画像：${show(file)}。共通の public/ には Dreamscape のために作った絵だけを置き、${ownFile(layer)} に登録してください。` +
          `出典のある写真なら、旅行編の public/ に置いて tourism/catalog.json の assets に出典つきで登録します` +
          `（Image without credit: ${assetPath} is not listed as own artwork）。`
        : `出典のない画像：${show(file)}。出典のある写真なら ${show(path.join(layer.directory, "tourism/catalog.json"))} の assets に出典つきで登録し、` +
          `Dreamscape のために作った絵なら ${ownFile(layer)} に登録してください` +
          `（Image without credit: ${assetPath} is neither a tourism asset nor listed as own artwork）。`);
  }

  for (const layer of sources.layers)
    for (const [assetPath, listedBy] of own.get(layer.id) ?? []) {
      const file = sources.publicFiles.get(assetPath);
      if (file && servingLayer(sources, file) === layer) continue;
      errors.push(`自作の絵の一覧にあるファイルがありません：${show(listedBy)} の "${assetPath}" は ${publicFolder(layer)}/${assetPath} にありません。` +
        `ファイルを消したり移したりしたなら、この行も直してください（Own artwork not served by its layer: ${assetPath}）。`);
    }

  if (errors.length) throw new Error(errors.join("\n"));
}

/**
 * The generated index of which journey provides each tourism image
 * (`src/content/generated/image-journeys.json`): journey ID → the IDs of the
 * assets its layer's tourism/catalog.json registers, in manifest and catalog
 * order. The merged runtime catalog does not record an asset's journey
 * (backgrounds name no city), and the credits list groups photos by journey.
 */
export function imageJourneyIndex(sources: Pick<ContentSources, "layers" | "catalogs">): {
  schemaVersion: 1; journeys: Record<string, string[]>;
} {
  const merged = sources.catalogs["tourism/catalog.json"];
  const assets = (merged?.value as { assets?: { id?: unknown }[] } | undefined)?.assets ?? [];
  const files = merged?.provenance.items.assets ?? [];
  const journeys: Record<string, string[]> = Object.fromEntries(
    sources.layers.filter((layer) => layer.type === "journey").map((layer) => [layer.id, []]));
  assets.forEach((asset, index) => {
    const layer = layerOfFile(sources.layers, files[index]);
    if (typeof asset.id === "string" && journeys[layer.id]) journeys[layer.id].push(asset.id);
  });
  return { schemaVersion: 1, journeys };
}
