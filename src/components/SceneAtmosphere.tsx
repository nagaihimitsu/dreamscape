import { useEffect, useState, type CSSProperties } from "react";
import type { WeatherKind } from "../content/tags";
import { weatherParts } from "./scene-atmosphere";
import "./scene-atmosphere.css";

// The scene's atmosphere (2026-11-13 user decision) in the five story screens: the colour of the time of day over the
// scene's picture and the line's weather above it, both under the portraits and the window. Decorative only
// (aria-hidden, no presses); never on free time, the night screen or the title.

/**
 * The colour of the time of day over the scene's picture (`color`: time-of-day.ts sceneTimeTint by the game clock,
 * transparent after the scene's `# tint: off`), inside the picture's own layer (`.vn-background`, `.battle-backdrop`):
 * it never lies over a face or the text. A change (`# tint:`, the clock) passes over --motion-scene.
 */
export function SceneTint({ color }: { color: string }) {
  return <span className="scene-tint" aria-hidden="true" style={{ backgroundColor: color }} />;
}

/** Whether the page is hidden (another tab, the phone locked): the weather then stands still. */
function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(() => typeof document !== "undefined" && document.hidden);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return hidden;
}

/**
 * The scene's weather (`# weather:`, kept to the scene's end): rain streaking down, dust and haze drifting, puffs of
 * colour powder floating up (Holi), petals falling. Over the scene's picture and under the portraits and the window, a
 * few light layers moved by the compositor only (scene-atmosphere.css), still while the page is hidden. Under reduced
 * motion it stands still: a faint veil of rain or haze, the powder's soft colours, a few still petals.
 */
export function WeatherLayer({ weather }: { weather?: WeatherKind }) {
  const hidden = usePageHidden();
  if (!weather) return null;
  return <div className="weather-layer" key={weather} data-weather={weather} data-paused={hidden || undefined} aria-hidden="true"
    data-testid="scene-weather">
    {weatherParts(weather).map((part) => <span key={part.key} className="weather-part" style={{
      "--x": `${part.x}%`, "--size": `${part.size}px`, "--rest-y": `${part.restY}%`, "--hue": part.hue,
      animationDuration: `${part.durationS}s`, animationDelay: `${part.delayS}s`,
    } as CSSProperties} />)}
  </div>;
}
