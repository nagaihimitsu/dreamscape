import { useCallback } from "react";

/**
 * A ref for an element whose current height (border box, CSS px) is written as
 * the custom property `name` on the app shell around it and kept up to date as
 * the element wraps or grows (larger text, a long amount, a held item); the
 * property goes with the element. The reserves under the header read these
 * heights instead of a fixed number (UI redesign §3.1 「Measured heights」).
 */
export function useMeasuredHeight(name: `--${string}`) {
  return useCallback((element: HTMLElement | null) => {
    const shell = element?.closest<HTMLElement>(".app-shell");
    if (!element || !shell) return;
    const write = (height: number) => shell.style.setProperty(name, `${Math.ceil(height * 100) / 100}px`);
    write(element.getBoundingClientRect().height);
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize?.[0];
      write(box ? box.blockSize : entry.target.getBoundingClientRect().height);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      shell.style.removeProperty(name);
    };
  }, [name]);
}
