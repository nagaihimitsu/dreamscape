import { useCallback, useEffect, useRef } from "react";
import "./reasoning-cutin.css";

/** A presentation-only transition: completing it must not change game state. */
export function ReasoningCutIn({
  kind,
  reduceMotion,
  onComplete,
}: {
  kind: "contradiction" | "connection";
  reduceMotion: boolean;
  onComplete: () => void;
}) {
  const callback = useRef(onComplete);
  callback.current = onComplete;
  const completed = useRef(false);
  const skip = useRef<HTMLButtonElement>(null);
  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    callback.current();
  }, []);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    skip.current?.focus({ preventScroll: true });
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const duration = reduceMotion || motion.matches ? 900 : 2200;
    const timer = window.setTimeout(finish, duration);
    const onVisibility = () => { if (document.hidden) finish(); };
    const onMotionChange = () => { if (motion.matches) finish(); };
    document.addEventListener("visibilitychange", onVisibility);
    if (motion.addEventListener) motion.addEventListener("change", onMotionChange);
    else motion.addListener(onMotionChange);
    if (document.hidden) finish();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      if (motion.removeEventListener) motion.removeEventListener("change", onMotionChange);
      else motion.removeListener(onMotionChange);
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected)
        previouslyFocused.focus({ preventScroll: true });
    };
  }, [finish, reduceMotion]);

  const contradiction = kind === "contradiction";
  return (
    <div
      className={`reasoning-cutin reasoning-cutin-${kind}`}
      data-testid="reasoning-cutin"
      data-kind={kind}
      data-reduce-motion={reduceMotion || undefined}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          finish();
        }
      }}
    >
      <div className="reasoning-cutin-visual" aria-hidden="true">
        {contradiction ? (
          <div className="reasoning-cutin-impact"><span>!</span></div>
        ) : (
          <div className="reasoning-cutin-connection">
            <span className="reasoning-cutin-card reasoning-cutin-card-left" />
            <span className="reasoning-cutin-line" />
            <span className="reasoning-cutin-card reasoning-cutin-card-right" />
          </div>
        )}
      </div>
      <div className="reasoning-cutin-copy" role="status" aria-live="polite" aria-atomic="true">
        <strong>{contradiction ? "矛盾追及！" : "証拠連結！"}</strong>
        <p>{contradiction ? "主張と矛盾する証拠を1枚突きつけろ！" : "2つの証拠を組み合わせよ！"}</p>
      </div>
      <button ref={skip} type="button" className="reasoning-cutin-skip" data-testid="reasoning-cutin-skip" onClick={finish}>
        演出をスキップ
      </button>
    </div>
  );
}
