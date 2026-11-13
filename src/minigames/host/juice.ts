import type { MiniGameJuice } from "../contract";
import type { HostClock } from "./clock";
import { burstAngles, hitStopMs } from "./flow";
import { seededRandom } from "./seed";

// The host's juice toolkit (docs/13 2.6; group3 6.4's values): drawn with the Web Animations API on the play's own
// elements (the individual `translate` and `scale` properties, so they add to a skin's own transform) and on the host's
// effects layer over the stage. With less motion only what is no motion stays: the hit-stop's stop and the refusal's sound.


type Animatable = Element & { animate?: Element["animate"] };
const animate = (element: Element | null | undefined, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
  const target = element as Animatable | null | undefined;
  return typeof target?.animate === "function" ? target.animate(keyframes, options) : undefined;
};

export interface JuiceSurface {
  /** The play's stage (what shakes; where a burst's point is measured). */
  stage(): HTMLElement | null;
  /** The host's effects layer over the stage (flashes and particles go in it). */
  fx(): HTMLElement | null;
  still: boolean;
  clock: HostClock;
  seed: number;
  /** Rings a shared sound (the host's own: the refusal's). */
  sound(id: string): void;
}

/** The shake of each level (group3 6.4): how far (px), how long (ms), and whether it moves sideways too. */
const SHAKES = { s: { px: 2, ms: 120, sideways: false }, m: { px: 4, ms: 200, sideways: true }, l: { px: 8, ms: 320, sideways: true } } as const;
/** A flash: light then dark, 33 ms each (never plain white). */
const FLASH = ["rgba(255, 248, 230, 0.45)", "rgba(20, 16, 12, 0.25)"] as const;

export function createJuice(surface: JuiceSurface): MiniGameJuice {
  const { still, clock } = surface;
  let count = 0;
  const random = () => seededRandom(surface.seed + ++count)();
  /** A point of the effects layer: an element's centre, or a point of the stage (0–1 across and down). */
  const pointOf = (at: Element | { x: number; y: number }, layer: HTMLElement) => {
    const box = layer.getBoundingClientRect();
    if ("getBoundingClientRect" in at) {
      const rect = at.getBoundingClientRect();
      return { x: rect.left + rect.width / 2 - box.left, y: rect.top + rect.height / 2 - box.top };
    }
    return { x: box.width * at.x, y: box.height * at.y };
  };
  const spawn = (layer: HTMLElement, className: string, x: number, y: number, size: number) => {
    const element = document.createElement("span");
    element.className = className;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
    element.appendChild(document.createElement("i"));
    layer.appendChild(element);
    return element;
  };
  const removeAfter = (element: Element, animation: Animation | undefined, ms: number) => {
    if (animation) animation.onfinish = () => element.remove();
    else setTimeout(() => element.remove(), ms);
  };

  return {
    hitStop(ms, target) {
      const length = hitStopMs(ms);
      clock.hold(length);
      const stage = surface.stage();
      // The field's own CSS motion stands still too.
      if (stage) {
        stage.dataset.hitstop = "";
        setTimeout(() => { delete stage.dataset.hitstop; }, length);
      }
      if (still || !target) return;
      // The thing hit shivers sideways, ±3 px to ±1 px, turning every 16 ms.
      const steps = Math.max(3, Math.round(length / 16));
      animate(target, Array.from({ length: steps + 1 }, (_, index) => {
        const px = index === steps ? 0 : (index % 2 ? -1 : 1) * Math.max(1, 3 - (2 * index) / steps);
        return { translate: `${px}px 0` };
      }), { duration: length });
    },
    shake(level = "m") {
      if (still) return;
      const shake = SHAKES[level];
      // Its size a little different each time (±30 %), easing out by 0.85 a frame.
      const px = shake.px * (0.7 + random() * 0.6);
      const steps = Math.max(4, Math.round(shake.ms / 16));
      animate(surface.stage(), Array.from({ length: steps + 1 }, (_, index) => {
        const size = index === steps ? 0 : px * 0.85 ** index * (index % 2 ? -1 : 1);
        const side = shake.sideways ? size * (random() - 0.5) * 2 : 0;
        return { translate: `${side.toFixed(1)}px ${size.toFixed(1)}px` };
      }), { duration: shake.ms });
    },
    flash(kind = "hit") {
      const layer = surface.fx();
      if (still || !layer) return;
      const element = document.createElement("span");
      element.className = "minigame-flash";
      layer.appendChild(element);
      const rounds = kind === "big" ? 2 : 1;
      const frames: Keyframe[] = [];
      for (let round = 0; round < rounds; round++) frames.push({ background: FLASH[0] }, { background: FLASH[1] });
      frames.push({ background: "transparent" });
      removeAfter(element, animate(element, frames, { duration: 66 * rounds + 33, easing: "steps(1, end)" }), 66 * rounds + 33);
    },
    burst(at, kind = "star", size = 1) {
      const layer = surface.fx();
      if (still || !layer || !at) return;
      const { x, y } = pointOf(at, layer);
      const scale = Math.min(2, Math.max(0.5, size));
      // The ring: from nothing to 1.6 times in 220 ms (every kind but dust has one).
      if (kind !== "dust") {
        const ring = spawn(layer, "minigame-burst-ring", x, y, 44 * scale);
        removeAfter(ring, animate(ring, [{ scale: "0", opacity: 1 }, { scale: "1.6", opacity: 0 }], { duration: 220, easing: "ease-out" }), 220);
      }
      if (kind === "ring") return;
      const counts = { star: 5, dust: 5, splash: 6 } as const;
      for (const angle of burstAngles(counts[kind], surface.seed + ++count)) {
        const distance = (40 + random() * 20) * scale;
        const life = 250 + random() * 150;
        const particle = spawn(layer, `minigame-particle minigame-particle-${kind}`, x, y, (kind === "star" ? 24 + random() * 12 : 10 + random() * 6) * scale);
        const radians = (angle * Math.PI) / 180;
        const dx = Math.cos(radians) * distance;
        const dy = Math.sin(radians) * distance + (kind === "star" ? 0 : 12 * scale);
        removeAfter(particle, animate(particle, [
          { translate: "-50% -50%", scale: "0.6", opacity: 1 },
          { translate: `calc(-50% + ${dx.toFixed(1)}px) calc(-50% + ${dy.toFixed(1)}px)`, scale: "1", opacity: 0 },
        ], { duration: life, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" }), life);
      }
    },
    squash(target, kind = "press") {
      if (still || !target) return;
      if (kind === "press") animate(target, [{ scale: "1" }, { scale: "0.94" }, { scale: "1" }], { duration: 120 });
      else animate(target, [{ scale: "1" }, { scale: "1.18 0.85", offset: 0.25 }, { scale: "0.92 1.08", offset: 0.58 }, { scale: "1" }], { duration: 240 });
    },
    denied(target) {
      surface.sound("ui_denied");
      if (still || !target) return;
      animate(target, [0, 4, -4, 3, -2, 0].map((px) => ({ translate: `${px}px 0` })), { duration: 120 });
    },
  };
}

/** A toolkit that does nothing (outside a play: a skin's field rendered on its own, a test). */
export const NO_JUICE: MiniGameJuice = { hitStop() {}, shake() {}, flash() {}, burst() {}, squash() {}, denied() {} };

