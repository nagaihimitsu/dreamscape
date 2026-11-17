import { spawnSync } from "node:child_process";
import { errorText } from "./cli-error";
import { PITCH_RATE, pitchStats } from "./voice-pitch";

// npm run voice:pitch -- <audio file> [<audio file> ...]: the pitch of each recording (voice-pitch.ts), one JSON line
// per file: { file, durationS, voicedS, voicedRatio, f0MedianHz, f0P10Hz, f0P90Hz, semitoneRangeP10P90 } (or error).
// Decodes with ffmpeg (on PATH) to 16 kHz mono. For casting (a model's sample) and for checking a delivered voice
// (authoring/CHARACTER_VOICE_GUIDE.md). Exits 1 when a file cannot be measured (the others are still printed).
const usage = "使い方: npm run voice:pitch -- 音声ファイル [音声ファイル ...]（ffmpeg が要ります）";

function decode(file: string): Float32Array {
  const result = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(PITCH_RATE), "-f", "f32le", "-"],
    { maxBuffer: 1 << 30 });
  if (result.error) throw new Error(`ffmpeg を起動できません（PATH にありますか）：${result.error.message}`);
  if (result.status !== 0) throw new Error(`ffmpeg で読めません：${result.stderr.toString().trim()}`);
  const bytes = result.stdout;
  return new Float32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 4));
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error(usage);
  process.exitCode = 1;
}
for (const file of files) {
  try {
    const stats = pitchStats(decode(file));
    console.log(JSON.stringify(stats ? { file, ...stats } : { file, error: "声のある所が見つかりません（no voiced frames）" }));
    if (!stats) process.exitCode = 1;
  } catch (error) {
    console.log(JSON.stringify({ file, error: errorText(error) }));
    process.exitCode = 1;
  }
}
