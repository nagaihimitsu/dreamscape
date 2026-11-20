import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { DismissLayer } from "./DismissLayer";
import { NewDot, Sparkle, SPARKLE_MS, useCuePlaying } from "./fx";
import { Icon } from "./icons";
import "./held-items.css";
import "./hud-outfits.css";

/** One choice of 「服」: 普段の服 (`id` null) or an outfit bought, with the heroine's small standing picture in it. */
export type OutfitOption = { id: string | null; name: string; picture: string | null };

/** The words under the choices while she cannot change (a scene is open). */
export const OUTFIT_LOCKED_JA = "着替えは、街歩きの間にできます。";

/**
 * The header's 「服」 (2026-11-20 user decision), left of the held items: shown once the party has bought an outfit (a
 * shop's card in free time). It opens a small panel under the header, as the held items' detail does (closed by its ×,
 * Esc, a tap anywhere else, which does nothing else, or the focus leaving the group), with 普段の服 and each outfit bought,
 * her small standing picture in each; the one she wears is pressed. A press changes at once (`onWear`), in free time only
 * (`canChange`: in a scene the choices are greyed and say why). `gained`: how many times an outfit has been bought in
 * play; each new count sends キラリ across the button. `fresh`: an outfit not seen in the panel yet (a dot on the button).
 */
export function HudOutfits({ options, worn, canChange, onWear, onOpen, gained, fresh = false, onSeen }: {
  options: readonly OutfitOption[];
  /** The outfit she wears (null: 普段の服). */
  worn: string | null;
  canChange: boolean;
  onWear: (id: string | null) => void;
  onOpen?: () => void;
  gained?: number;
  fresh?: boolean;
  onSeen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const gainedPlaying = useCuePlaying(gained, SPARKLE_MS);
  const groupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const shown = open && options.length > 1;

  useEffect(() => {
    if (!shown) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector("dialog[open]")) return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    // A press on another of the header's buttons (above the layer) closes the panel too, and works as usual.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target && !groupRef.current?.contains(target) && !target.closest(".dismiss-layer")) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [shown]);

  // The panel ends above the screen's bottom edge and scrolls inside when it is longer (as the held items' detail).
  useLayoutEffect(() => {
    const detail = detailRef.current;
    if (!shown || !detail) return;
    const fit = () => { detail.style.maxHeight = `${Math.max(120, window.innerHeight - detail.getBoundingClientRect().top - 12)}px`; };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("scroll", fit, { passive: true });
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("scroll", fit);
    };
  }, [shown]);

  if (options.length < 2) return null;
  const wornName = options.find((option) => option.id === worn)?.name ?? options[0].name;
  return (
    <div
      className="hud-outfits"
      ref={groupRef}
      role="group"
      aria-label="ヒロインの服"
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (shown && next instanceof Node && !groupRef.current?.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="hud-outfits-button fx-host"
        data-testid="hud-outfits"
        aria-label={`服（今は${wornName}）${fresh ? "、新しい服あり" : ""}`}
        aria-expanded={shown}
        aria-controls={shown ? `${id}-detail` : undefined}
        onClick={() => {
          if (!shown) {
            onOpen?.();
            if (fresh) onSeen?.();
          }
          setOpen(!shown);
        }}
      >
        <span className="held-item-picture">
          <span className="held-items-bag-icon"><Icon name="hanger" /></span>
          <span className="held-items-word">服</span>
        </span>
        <Sparkle playing={gainedPlaying} cue={gained} />
        {fresh && <NewDot />}
      </button>
      {shown && <>
        <DismissLayer owner={groupRef.current} onClose={(focusWasInside) => {
          setOpen(false);
          if (focusWasInside) buttonRef.current?.focus({ preventScroll: true });
        }} />
        <div ref={detailRef} id={`${id}-detail`} className="held-item-detail hud-outfits-detail" role="dialog" aria-labelledby={`${id}-name`}
          data-testid="hud-outfits-panel">
          <div className="held-item-detail-heading">
            <strong id={`${id}-name`}>服を選ぶ</strong>
            <button type="button" className="held-item-close" aria-label="服を閉じる" onClick={() => {
              setOpen(false);
              buttonRef.current?.focus();
            }}>×</button>
          </div>
          <ul className="hud-outfits-list">
            {options.map((option) => {
              const isWorn = option.id === worn;
              return <li key={option.id ?? ":usual"}>
                <button type="button" className="hud-outfit" aria-pressed={isWorn} disabled={!canChange && !isWorn}
                  data-testid={`hud-outfit-${option.id ?? "usual"}`}
                  onClick={() => { if (canChange && !isWorn) onWear(option.id); }}>
                  <span className="hud-outfit-figure" aria-hidden="true">
                    {option.picture && <img src={`${import.meta.env.BASE_URL}${option.picture}`} alt="" loading="lazy" decoding="async" />}
                  </span>
                  <span className="hud-outfit-name">{option.name}</span>
                  {isWorn && <span className="hud-outfit-worn">着ています</span>}
                </button>
              </li>;
            })}
          </ul>
          {!canChange && <p className="hud-outfits-note">{OUTFIT_LOCKED_JA}</p>}
        </div>
      </>}
    </div>
  );
}
