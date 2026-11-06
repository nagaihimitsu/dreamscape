import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp, { type PngOptions, type Sharp } from "sharp";

// Regenerates the browser icons in the shared public/ from the master artwork
// (`npm run icons:build`). The master is a rounded square on a near-white
// background; the corners become transparent here.
//   favicon-16/32/48.png  face crop (a whole figure is unreadable at tab size)
//   apple-touch-icon.png  full image, opaque: iOS shows transparency as black
//                         and applies its own (smaller) rounded mask
//   icon-192/512.png      full image for the web app manifest

const MASTER = "authoring/brand/favicon-master.png";
const OUTPUT = "public";
/** The master's corner radius (251 px at 1254 px) as a share of its side. */
const CORNER_RADIUS = 0.2;
/**
 * Pulls the transparent corner in so the master's anti-aliased white edge does
 * not show. Applied along the whole arc and faded out within FADE_ANGLE of
 * where the arc meets the straight edges, which keep their outermost pixels
 * fully opaque (the master's artwork reaches its straight borders).
 */
const CORNER_INSET = 0.0012;
const FADE_ANGLE = (5 * Math.PI) / 180;
/** The face, in master pixels. */
const FACE = { left: 300, top: 110, width: 620, height: 620 };
/** Matches the master's near-white corners for the opaque Apple touch icon. */
const OPAQUE_BACKGROUND = "#ffffff";

/** `image` (square RGB) with transparent rounded corners, as raw RGBA at its own size. */
async function roundCorners(image: Sharp, inset: number) {
  const { data, info } = await image.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const size = info.width;
  if (info.height !== size) throw new Error(`Icon source must be square, got ${info.width}x${info.height}`);
  const radius = CORNER_RADIUS * size;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Distance of the pixel centre from the nearest corner circle's centre.
      const dx = Math.max(radius - (x + 0.5), x + 0.5 - (size - radius), 0);
      const dy = Math.max(radius - (y + 0.5), y + 0.5 - (size - radius), 0);
      const distance = Math.hypot(dx, dy);
      // sin(2θ) of the pixel's angle in the corner is 0 along the straight edges; full inset from FADE_ANGLE on.
      const angle = distance > 0 ? (2 * dx * dy) / (distance * distance) : 0;
      const edge = radius - inset * size * Math.min(1, angle / Math.sin(2 * FADE_ANGLE));
      const coverage = Math.min(1, Math.max(0, edge - distance + 0.5));
      const from = (y * size + x) * 3;
      const to = (y * size + x) * 4;
      rgba[to] = data[from];
      rgba[to + 1] = data[from + 1];
      rgba[to + 2] = data[from + 2];
      rgba[to + 3] = Math.round(coverage * 255);
    }
  }
  return { data: rgba, size };
}

/** PNG options: the large icons as 256-colour PNGs (a fifth of the size, no visible difference). */
const pngOptions = (size: number): PngOptions => ({ compressionLevel: 9, palette: size >= 180 });

async function writePng(source: { data: Buffer; size: number }, size: number, file: string) {
  await sharp(source.data, { raw: { width: source.size, height: source.size, channels: 4 } })
    .resize(size, size, { kernel: "lanczos3" })
    .png(pngOptions(size))
    .toFile(path.join(OUTPUT, file));
  console.log(`${OUTPUT}/${file}`);
}

const master = sharp(MASTER);
const { width, height } = await master.metadata();
if (!width || width !== height) throw new Error(`${MASTER} must be square, got ${width}x${height}`);
mkdirSync(OUTPUT, { recursive: true });

const face = await roundCorners(sharp(MASTER).extract(FACE), 0);
for (const size of [16, 32, 48]) await writePng(face, size, `favicon-${size}.png`);

const full = await roundCorners(sharp(MASTER), CORNER_INSET);
for (const size of [192, 512]) await writePng(full, size, `icon-${size}.png`);

await sharp(MASTER)
  .flatten({ background: OPAQUE_BACKGROUND })
  .resize(180, 180, { kernel: "lanczos3" })
  .png(pngOptions(180))
  .toFile(path.join(OUTPUT, "apple-touch-icon.png"));
console.log(`${OUTPUT}/apple-touch-icon.png`);
