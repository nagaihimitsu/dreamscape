import type { SceneShakeSize, WeatherKind } from "../content/tags";

// The scene's atmosphere (2026-11-13 user decision): the drawn parts of a line's `# weather:`, the scene's shake of
// `# shake` and the portraits' breathing. Pure rules, apart from the components (SceneAtmosphere.tsx,
// CharacterPortrait.tsx, DialogueText.tsx). Presentation only: nothing here reads the game state, and nothing of it is
// random (nothing to save, and the same scene looks the same each time).

/** How many drawn parts each weather has: colour puffs and petals; rain and dust are drawn by their layer alone. */
export const WEATHER_PART_COUNTS: Readonly<Record<WeatherKind, number>> = { rain: 0, dust: 0, colors: 6, petals: 8 };

/**
 * One drawn part of a weather (a colour puff, a petal): where it is across the scene (`x`, percent), how long one
 * float or fall takes and where in it the part starts (a negative delay: the scene opens with the parts already on
 * their way), where it rests under reduced motion (`restY`, percent down the scene), its size (px) and its hue.
 */
export type WeatherPart = { key: number; x: number; durationS: number; delayS: number; restY: number; size: number; hue: number };

/** The fractional part of n times the golden ratio: an even, unrandom spread of 0 to 1. */
const spread = (index: number, salt: number) => ((index + 1) * 0.618034 + salt) % 1;
const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

/** The colour powder's hues (Holi's pink, yellow, green, blue, orange and violet), one a puff in turn. */
const POWDER_HUES = [330, 48, 140, 205, 24, 280] as const;

/** The drawn parts of a weather (none for rain and dust), the same every time. */
export function weatherParts(kind: WeatherKind): WeatherPart[] {
  const count = WEATHER_PART_COUNTS[kind];
  const petals = kind === "petals";
  return Array.from({ length: count }, (_, index): WeatherPart => {
    // Across the width in even bands, each a little off its band's middle.
    const x = round(((index + 0.25 + spread(index, 0.1) * 0.5) / count) * 100);
    const durationS = round(petals ? 9 + spread(index, 0.3) * 4 : 7 + spread(index, 0.5) * 3);
    return {
      key: index,
      x,
      durationS,
      delayS: -round(spread(index, 0.7) * durationS),
      restY: round(petals ? 12 + spread(index, 0.9) * 70 : 30 + spread(index, 0.2) * 45),
      size: Math.round(petals ? 9 + spread(index, 0.4) * 5 : 90 + spread(index, 0.6) * 60),
      hue: petals ? Math.round(338 + spread(index, 0.8) * 16) : POWDER_HUES[index % POWDER_HUES.length],
    };
  });
}

/** A scene's shake (`# shake`): how far it moves (px) and how long it takes (ms), by its size. */
export const SCENE_SHAKES: Readonly<Record<SceneShakeSize, { px: number; ms: number }>> = {
  small: { px: 3, ms: 300 },
  normal: { px: 6, ms: 380 },
  large: { px: 10, ms: 450 },
};

/**
 * The keyframes of a scene's shake: a few moves each smaller than the one before, ending where it started, mostly
 * sideways with a little up and down. `zoom`: the scene's picture grows a little meanwhile, so that its edges never
 * show inside the scene (its people do not).
 */
export function sceneShakeFrames(size: SceneShakeSize, zoom: boolean): Keyframe[] {
  const { px } = SCENE_SHAKES[size];
  const moves: readonly (readonly [number, number])[] = [[0, 0], [-1, 0.3], [0.8, -0.25], [-0.55, 0.2], [0.3, -0.1], [0, 0]];
  const grown = round(1 + (2 * px + 2) / 360, 3);
  return moves.map(([x, y], index) => ({
    translate: `${round(x * px)}px ${round(y * px)}px`,
    ...(zoom ? { scale: index === 0 || index === moves.length - 1 ? "1" : `${grown}` } : {}),
  }));
}

/** One rise and fall of a portrait's breathing takes 4.2 to 4.9 s, by its character (so two never move together). */
const BREATH_MIN_MS = 4200;
const BREATH_RANGE_MS = 700;

/** A character's ID as a number (FNV-1a), for its breathing. */
function hashOf(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return hash >>> 0;
}

/**
 * The breathing of a character's portrait (2026-11-13 user decision): a slow rise and fall of its picture, its length
 * by the character, and where in it the picture is now (`delayMs`, negative), from the page's clock (`nowMs`,
 * performance.now()): a picture put up again (a new expression) goes on from where the last one was, and two
 * characters are out of phase.
 */
export function portraitBreath(characterId: string, nowMs: number): { durationMs: number; delayMs: number } {
  const hash = hashOf(characterId);
  const durationMs = BREATH_MIN_MS + (hash % 8) * (BREATH_RANGE_MS / 7);
  const offset = (hash >>> 3) % durationMs;
  const at = Number.isFinite(nowMs) ? nowMs : 0;
  return { durationMs: Math.round(durationMs), delayMs: -Math.round((((at + offset) % durationMs) + durationMs) % durationMs) };
}
