#!/usr/bin/env node
/* Renders the India opening movie (content/journeys/golden_triangle/public/assets/movies/gt_opening.mp4) from index.html.

   One command does everything (from the repository root; README.md beside src/ tells more):
       node authoring/journeys/golden_triangle/movies/opening/src/render.mjs

   1. opens src/index.html in Playwright Chromium (720x1280, deviceScaleFactor 1),
   2. steps the time at 30 fps and saves each of the 450 frames as out/frames/f0000.png ... f0449.png
      (one capture at a time; frames in which things move fast are the blend of several captures inside
      the frame's shutter time, which gives motion blur),
   3. runs ffmpeg: H.264 (libx264, yuv420p, +faststart) with music/segment.flac as AAC 128k, and writes
      out/gt_opening.mp4, raising the CRF until the file is no larger than --max-bytes,
   4. prints the duration and size.
   out/ (beside src/) is not kept in Git. Copy out/gt_opening.mp4 into the game by hand once it is checked.

   Options:
       --shutter 0.5        part of the frame interval the shutter is open (0 = no motion blur, one capture per frame)
       --max-samples 48     most captures blended into one frame
       --from 0 --to 449    only these frames (the frames folder is then not emptied first)
       --frames-only        stop after the frames
       --encode-only        use the frames already in out/frames
       --crf 19.5           first CRF tried (it goes up in steps of 0.5 until the file fits)
       --max-bytes 2990000  largest file allowed
       --gain -5.8          music level change in dB (the cut is mastered 5.8 dB above the game's music)

   The movie is played from its start to its end and never searched, so the encoder is not made to put in a
   key frame every few seconds (-g 450): a key frame in the middle of a still picture would cost about 90 kB for nothing.
   It still puts one wherever the picture changes abruptly.
   Five reference frames keep the stream at H.264 level 3.1 (as the first prototype), which phones decode in hardware.
*/
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);                                   // the folder of this movie (beside src/)
const FRAMES_DIR = path.join(ROOT, "out", "frames");
const MOVIE = path.join(ROOT, "out", "gt_opening.mp4");
const MUSIC = path.join(ROOT, "music", "segment.flac");   // lossless: the same samples as the segment.wav the movie was first made with
const W = 720, H = 1280;

const argv = process.argv.slice(2);
const flag = name => argv.includes("--" + name);
const opt = (name, fallback) => { const i = argv.indexOf("--" + name); return i >= 0 ? Number(argv[i + 1]) : fallback; };
const OPT = {
  shutter: opt("shutter", 0.5), maxSamples: opt("max-samples", 48), step: opt("step", 1.5),
  from: opt("from", 0), to: opt("to", -1),
  crf: opt("crf", 19.5), maxBytes: opt("max-bytes", 2990000), gain: opt("gain", -5.8),
  framesOnly: flag("frames-only"), encodeOnly: flag("encode-only"),
};

/* ---------- PNG in and out (8-bit RGB or RGBA, not interlaced), enough for Chromium's screenshots ---------- */
function decodePng(buf) {
  let pos = 8, w = 0, h = 0, type = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), kind = buf.toString("latin1", pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9]; if (data[8] !== 8 || (type !== 2 && type !== 6) || data[12] !== 0) throw new Error("unexpected PNG format"); }
    else if (kind === "IDAT") idat.push(data);
    else if (kind === "IEND") break;
    pos += 12 + len;
  }
  const bpp = type === 6 ? 4 : 3, stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), out = new Uint8Array(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride, up = dst - stride;
    if (f === 0) out.set(raw.subarray(src, src + stride), dst);
    else if (f === 1) { for (let x = 0; x < bpp; x++) out[dst + x] = raw[src + x]; for (let x = bpp; x < stride; x++) out[dst + x] = raw[src + x] + out[dst + x - bpp]; }
    else if (f === 2) { if (y === 0) out.set(raw.subarray(src, src + stride), dst); else for (let x = 0; x < stride; x++) out[dst + x] = raw[src + x] + out[up + x]; }
    else for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[dst + x - bpp] : 0, b = y > 0 ? out[up + x] : 0, c = x >= bpp && y > 0 ? out[up + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      else throw new Error("unexpected PNG filter " + f);
      out[dst + x] = v;
    }
  }
  return { w, h, bpp, data: out };
}
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function chunk(kind, data) {
  const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(kind, 4, "latin1"); data.copy(out, 8);
  let c = 0xFFFFFFFF; for (let i = 4; i < 8 + data.length; i++) c = CRC[(c ^ out[i]) & 255] ^ (c >>> 8);
  out.writeUInt32BE((c ^ 0xFFFFFFFF) >>> 0, 8 + data.length); return out;
}
function encodePng(w, h, rgb) {                                    // RGB, "up" filter on every row
  const stride = w * 3, raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    const dst = y * (stride + 1), src = y * stride; raw[dst] = y ? 2 : 0;
    if (y) for (let x = 0; x < stride; x++) raw[dst + 1 + x] = (rgb[src + x] - rgb[src + x - stride]) & 255;
    else for (let x = 0; x < stride; x++) raw[dst + 1 + x] = rgb[src + x];
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 4 })), chunk("IEND", Buffer.alloc(0))]);
}
/* blending is done in linear light, as a camera would */
const TO_LINEAR = new Float32Array(256).map((_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
const TO_SRGB = new Uint8Array(65536).map((_, i) => { const c = i / 65535; return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); });

/* ---------- frames ---------- */
async function captureFrames() {
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ args: ["--font-render-hinting=none", "--enable-font-subpixel-positioning", "--disable-lcd-text", "--force-color-profile=srgb"] });
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const problems = [];
    page.on("pageerror", e => problems.push(String(e)));
    page.on("console", m => { if (m.type() === "error") problems.push(m.text()); });
    page.on("requestfailed", r => problems.push("request failed: " + r.url()));
    await page.route("**/*", route => route.request().url().startsWith("file:") ? route.continue() : route.abort());   // no network at render time
    await page.goto(pathToFileURL(path.join(HERE, "index.html")).href + "?render=1");
    await page.waitForFunction("window.GT_READY === true || window.GT_ERROR", null, { timeout: 60000 });
    const pageError = await page.evaluate("window.GT_ERROR || null");
    if (pageError || problems.length) throw new Error("the page did not load cleanly: " + [pageError, ...problems].filter(Boolean).join(" | "));
    const info = await page.evaluate("({ fps: GT.FPS, frames: GT.FRAMES, dur: GT.DUR })");
    const first = OPT.from, last = OPT.to < 0 ? info.frames - 1 : Math.min(OPT.to, info.frames - 1), whole = first === 0 && last === info.frames - 1;
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
    if (whole) for (const f of fs.readdirSync(FRAMES_DIR)) if (/^f\d+\.png$/.test(f)) fs.unlinkSync(path.join(FRAMES_DIR, f));   // keep the frames of the last render only

    const cdp = await page.context().newCDPSession(page);
    const shot = async t => {
      await page.evaluate(tt => window.renderAt(tt), t);
      const { data } = await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true });
      return Buffer.from(data, "base64");
    };
    const acc = new Float32Array(W * H * 3), rgb = new Uint8Array(W * H * 3);
    const started = Date.now(); let captures = 0, blended = 0, copied = 0, lastStill = null;
    for (let f = first; f <= last; f++) {
      const t0 = f / info.fps, open = OPT.shutter / info.fps;
      const move = OPT.shutter > 0 ? await page.evaluate(([t, dt]) => GT.motionPx(t, dt), [t0, open]) : 0;
      // still frames: one capture; slow drifts: four (this evens out the pixel grid); fast moves: one every 1.5 px of travel
      const n = move < 0.03 ? 1 : Math.max(4, Math.min(OPT.maxSamples, Math.ceil(move / OPT.step) + 1));
      const file = path.join(FRAMES_DIR, "f" + String(f).padStart(4, "0") + ".png");
      if (n === 1) {
        // nothing moves in this frame: if the page is exactly as it was for the frame before, that frame is copied, so a held picture is truly still
        const sig = await page.evaluate(t => { window.renderAt(t); return GT.signature(); }, t0);
        if (lastStill && lastStill.sig === sig) { fs.copyFileSync(lastStill.file, file); copied++; }
        else { fs.writeFileSync(file, await shot(t0)); captures++; }
        lastStill = { sig, file };
      } else {
        lastStill = null;
        acc.fill(0);
        for (let i = 0; i < n; i++) {
          const png = decodePng(await shot(t0 + open * i / n)); captures++;
          if (png.w !== W || png.h !== H) throw new Error(`capture is ${png.w}x${png.h}, expected ${W}x${H}`);
          const d = png.data, bpp = png.bpp;
          for (let p = 0, q = 0; q < acc.length; p += bpp, q += 3) { acc[q] += TO_LINEAR[d[p]]; acc[q + 1] += TO_LINEAR[d[p + 1]]; acc[q + 2] += TO_LINEAR[d[p + 2]]; }
        }
        const k = 65535 / n;
        for (let q = 0; q < acc.length; q++) rgb[q] = TO_SRGB[Math.min(65535, Math.round(acc[q] * k))];
        fs.writeFileSync(file, encodePng(W, H, rgb)); blended++;
      }
      if (f % 30 === 0 || f === last) process.stdout.write(`\rframe ${f}/${last}  captures ${captures}  ${((Date.now() - started) / 1000).toFixed(0)} s   `);
    }
    process.stdout.write("\n");
    if (problems.length) throw new Error("errors while rendering: " + problems.join(" | "));
    console.log(`frames: ${last - first + 1} written to ${FRAMES_DIR} (${blended} blended from several captures, ${copied} copies of an unchanged frame, ${captures} captures in all)`);
    return info;
  } finally { await browser.close(); }
}

/* ---------- movie ---------- */
function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`${cmd} failed:\n${(r.stderr || "").split("\n").slice(-25).join("\n")}`);
  return r.stdout;
}
function encode(fps, frames) {
  const have = fs.readdirSync(FRAMES_DIR).filter(f => /^f\d{4}\.png$/.test(f)).length;
  if (have !== frames) throw new Error(`expected ${frames} frames in ${FRAMES_DIR}, found ${have}`);
  const seconds = frames / fps;
  let crf = OPT.crf, size = 0;
  for (; crf <= 30; crf += 0.5) {
    run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y",
      "-framerate", String(fps), "-i", path.join(FRAMES_DIR, "f%04d.png"), "-i", MUSIC,
      "-map", "0:v:0", "-map", "1:a:0",
      "-vf", "scale=in_range=pc:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int+bicubic,format=yuv420p",
      "-c:v", "libx264", "-preset", "veryslow", "-refs", "5", "-crf", String(crf), "-profile:v", "high", "-level:v", "3.1", "-pix_fmt", "yuv420p", "-g", "450", "-threads", "2",
      "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
      "-af", `volume=${OPT.gain}dB`, "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
      "-t", String(seconds), "-movflags", "+faststart", MOVIE]);
    size = fs.statSync(MOVIE).size;
    console.log(`crf ${crf}: ${size} bytes (${(size / 1e6).toFixed(2)} MB)`);
    if (size <= OPT.maxBytes) break;
  }
  if (size > OPT.maxBytes) throw new Error("could not get under " + OPT.maxBytes + " bytes");
  const probe = JSON.parse(run("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", "-count_frames", MOVIE]));
  const v = probe.streams.find(s => s.codec_type === "video"), a = probe.streams.find(s => s.codec_type === "audio");
  console.log(`movie: ${MOVIE}`);
  console.log(`  video: ${v.codec_name} ${v.profile}, ${v.width}x${v.height}, ${v.pix_fmt}, ${v.r_frame_rate} fps, ${v.nb_read_frames} frames, ${Number(v.duration).toFixed(6)} s, ${Math.round(v.bit_rate / 1000)} kbit/s, crf ${crf}`);
  console.log(`  audio: ${a.codec_name} ${a.profile}, ${a.sample_rate} Hz, ${a.channels} ch, ${Number(a.duration).toFixed(6)} s, ${Math.round(a.bit_rate / 1000)} kbit/s, gain ${OPT.gain} dB`);
  console.log(`  duration: ${Number(probe.format.duration).toFixed(6)} s    size: ${probe.format.size} bytes (${(probe.format.size / 1e6).toFixed(2)} MB)`);
}

const info = OPT.encodeOnly ? { fps: 30, frames: 450 } : await captureFrames();
if (!OPT.framesOnly && OPT.from === 0 && OPT.to < 0) encode(info.fps, info.frames);
