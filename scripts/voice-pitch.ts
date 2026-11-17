// The pitch (F0) of a speech recording (2026-11-17, for casting the voices other than the heroine's: which models are
// high or low, and how far apart two voices of a scene are). A YIN-like tracker: the cumulative mean normalized
// difference of 40 ms frames every 10 ms, searching 60-500 Hz, on 16 kHz mono samples (voice-pitch-cli.ts decodes the
// files with ffmpeg). The repository version of the casting's scratch f0.py (same steps and numbers). Pure.

export const PITCH_RATE = 16000;
const FRAME = Math.round(0.04 * PITCH_RATE);
const HOP = Math.round(0.01 * PITCH_RATE);
const F_MIN = 60;
const F_MAX = 500;
const THRESHOLD = 0.15;

/** What voice:pitch prints for a file: its length, how much of it is voiced, and the pitch of the voiced frames. */
export type PitchStats = {
  durationS: number;
  voicedS: number;
  voicedRatio: number;
  /** The median and the 10th and 90th percentiles of the voiced frames, in Hz. */
  f0MedianHz: number;
  f0P10Hz: number;
  f0P90Hz: number;
  /** How wide the voice moves: from the 10th to the 90th percentile, in semitones. */
  semitoneRangeP10P90: number;
};

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

/** The F0 of one frame (mean removed), or undefined when it has no clear period. */
function frameF0(frame: Float64Array): number | undefined {
  const tauMin = Math.floor(PITCH_RATE / F_MAX);
  const tauMax = Math.floor(PITCH_RATE / F_MIN);
  const width = frame.length - tauMax;
  if (width <= 0) return undefined;
  const diff = new Float64Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let index = 0; index < width; index++) {
      const delta = frame[index] - frame[index + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }
  const normalized = new Float64Array(tauMax + 1).fill(1);
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += diff[tau];
    normalized[tau] = running === 0 ? 1 : (diff[tau] * tau) / running;
  }
  for (let tau = tauMin; tau < tauMax; tau++) {
    if (normalized[tau] >= THRESHOLD) continue;
    while (tau + 1 < tauMax && normalized[tau + 1] < normalized[tau]) tau++;
    // A parabola through the minimum and its neighbours.
    const [a, b, c] = [normalized[tau - 1], normalized[tau], normalized[tau + 1]];
    const denominator = a - 2 * b + c;
    const shift = tau >= 1 && tau < tauMax && denominator !== 0 ? (0.5 * (a - c)) / denominator : 0;
    return PITCH_RATE / (tau + shift);
  }
  return undefined;
}

/** The value at a percentile of sorted values (linear between neighbours, as numpy's percentile). */
function percentile(sorted: readonly number[], part: number): number {
  const at = (sorted.length - 1) * part;
  const low = Math.floor(at);
  const high = Math.ceil(at);
  return sorted[low] + (sorted[high] - sorted[low]) * (at - low);
}

/**
 * The pitch of mono samples at PITCH_RATE: frames quieter than a tenth of the whole's RMS are skipped, and voiced frames
 * more than an octave from the median are dropped (octave errors). Undefined when no frame is voiced.
 */
export function pitchStats(samples: ArrayLike<number>): PitchStats | undefined {
  const durationS = samples.length / PITCH_RATE;
  if (!samples.length) return undefined;
  let total = 0;
  for (let index = 0; index < samples.length; index++) total += samples[index] ** 2;
  const loud = Math.sqrt(total / samples.length);
  const found: number[] = [];
  for (let start = 0; start < samples.length - FRAME; start += HOP) {
    const frame = new Float64Array(FRAME);
    let energy = 0;
    let mean = 0;
    for (let index = 0; index < FRAME; index++) {
      frame[index] = samples[start + index];
      energy += frame[index] ** 2;
      mean += frame[index];
    }
    if (Math.sqrt(energy / FRAME) < 0.1 * loud) continue;
    mean /= FRAME;
    for (let index = 0; index < FRAME; index++) frame[index] -= mean;
    const f0 = frameF0(frame);
    if (f0 !== undefined && f0 >= F_MIN && f0 <= F_MAX) found.push(f0);
  }
  if (!found.length) return undefined;
  const median = percentile([...found].sort((left, right) => left - right), 0.5);
  const kept = found.filter((f0) => f0 > median / 2 && f0 < median * 2).sort((left, right) => left - right);
  const [p10, p50, p90] = [0.1, 0.5, 0.9].map((part) => percentile(kept, part));
  const voicedS = (kept.length * HOP) / PITCH_RATE;
  return {
    durationS: round(durationS, 2), voicedS: round(voicedS, 2), voicedRatio: round(voicedS / durationS, 2),
    f0MedianHz: round(p50, 1), f0P10Hz: round(p10, 1), f0P90Hz: round(p90, 1), semitoneRangeP10P90: round(12 * Math.log2(p90 / p10), 1),
  };
}

/** How many semitones apart two pitches are (positive when `high` is higher). */
export const semitonesBetween = (high: number, low: number) => round(12 * Math.log2(high / low), 1);
