import type { HTMLAttributes, ReactNode } from "react";
import { Icon } from "./icons";
import { useMeasuredHeight } from "./useMeasuredHeight";
import "./scene-label.css";

/**
 * The scene label line (UI redesign §3.2): one line right under the header in a
 * sightseeing guide, a battle, a date and an encounter, over the scene's picture.
 * On the left the scene's visible heading as a status pill (where the scene is:
 * the landmark, the date's destination, the place of an encounter; it wraps and
 * is never cut), on the right the scene's own buttons (出典, 手がかり帳). Its
 * height is measured as `--label-h`, so the scene below it starts under it
 * however the label wraps.
 *
 * The line is part of the scene but marked `data-no-advance` (tap anywhere,
 * scene-tap.ts): a tap on the pill or between the buttons is a near miss and
 * never reads the story on, as a tap on the header above it.
 *
 * The pill is the scene's heading that takes a lost focus when the scene opens
 * (`tabIndex={-1}`, scene-focus.ts; UI redesign §3.7 E).
 */
export function SceneLabelLine({ label, labelProps, children }: {
  label: ReactNode;
  /** Kept names and test ids of the pill (the battle's place, the date's destination). */
  labelProps?: HTMLAttributes<HTMLHeadingElement> & { "data-testid"?: string };
  /** The scene's buttons, right-aligned: 出典 first, then 手がかり帳 at the edge. */
  children?: ReactNode;
}) {
  const measured = useMeasuredHeight("--label-h");
  return (
    <div className="scene-label-line" data-testid="scene-label-line" data-no-advance ref={measured}>
      <h1 className="scene-label" tabIndex={-1} {...labelProps}>{label}</h1>
      {children && <div className="scene-label-tools">{children}</div>}
    </div>
  );
}

/**
 * 出典 (D16, S3): opens the credits of the scene's registered photo. The visible
 * word is 「出典」 (the icon joins it on wider screens); its name 「画像の出典」
 * contains it.
 */
export function SceneCreditButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="scene-credit" aria-label="画像の出典" onClick={onClick}>
      <Icon name="credit" />出典
    </button>
  );
}

/** 手がかり帳 (S1, S6): a parchment tab at the line's right edge. */
export function SceneNotebookTab({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="notebook-button scene-notebook" onClick={onClick}>
      <Icon name="book" />手がかり帳<Icon name="chevron-right" className="scene-notebook-chevron" />
    </button>
  );
}
