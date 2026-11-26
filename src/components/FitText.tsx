import { Fragment, useLayoutEffect, useMemo, useRef } from "react";
import { countLines, fitScale, headingPhrases } from "./fit-text";
import "./fit-text.css";

/**
 * A heading's words (a name a writer gives: a place, a term, an item, a chapter), set to fit the heading
 * (docs/02_TECH_ARCHITECTURE.md「見出しの字の収め方」): they break only between phrases (<wbr>, fit-text.ts), and take
 * the largest size, from the heading's own down to `minScale` of it, that keeps them to one line; failing that, the
 * heading's own size on two balanced lines (up to `maxLines`, then smaller). Put it inside the heading element, which
 * keeps its own size, font and width: the words are measured against the heading's width, so the heading must not take
 * its width from its words. Refits when the heading's width or size (the 文字の大きさ setting) changes, and when a web
 * font arrives. Where nothing can be measured (a hidden heading, the tests' DOM), the words stay at the heading's size.
 */
export function FitText({ text, className, minScale = 0.8, maxLines = 2 }: { text: string; className?: string; minScale?: number; maxLines?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const phrases = useMemo(() => headingPhrases(text), [text]);
  useLayoutEffect(() => {
    const words = ref.current;
    const heading = words?.parentElement;
    if (!words || !heading) return;
    let seen = "";
    const fit = () => {
      const width = heading.clientWidth;
      const basePx = Number.parseFloat(getComputedStyle(heading).fontSize);
      const key = `${width}/${basePx}`;
      if (key === seen) return;
      seen = key;
      words.style.removeProperty("--fit-scale");
      if (width === 0 || !(basePx > 0) || typeof document.createRange !== "function") return;
      const range = document.createRange();
      range.selectNodeContents(words);
      if (typeof range.getClientRects !== "function") return;
      const linesAt = (scale: number) => {
        words.style.setProperty("--fit-scale", String(scale));
        return countLines(Array.from(range.getClientRects()));
      };
      if (linesAt(1) === 0) {
        words.style.removeProperty("--fit-scale");
        return;
      }
      const scale = fitScale(basePx, linesAt, { minScale, maxLines });
      if (scale === 1) words.style.removeProperty("--fit-scale");
      else words.style.setProperty("--fit-scale", String(scale));
    };
    fit();
    const refit = () => { seen = ""; fit(); };
    // Fitted on the next frame, not inside the observer: the fit changes the heading's height, which inside the
    // observer's callback is a size change it cannot deliver in the same frame (「ResizeObserver loop completed with
    // undelivered notifications」, an error on the page).
    let frame = 0;
    const observer = typeof ResizeObserver === "function"
      ? new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit); })
      : undefined;
    observer?.observe(heading);
    document.fonts?.addEventListener?.("loadingdone", refit);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", refit);
    };
  }, [phrases, minScale, maxLines]);
  return <span ref={ref} className={className ? `fit-text ${className}` : "fit-text"}>
    {phrases.map((phrase, index) => <Fragment key={index}>{index > 0 && <wbr />}{phrase}</Fragment>)}
  </span>;
}
