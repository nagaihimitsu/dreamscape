import { createContext, useContext } from "react";
import { NewDot, Sparkle, SPARKLE_MS, useCuePlaying } from "./fx";

/**
 * 手がかり帳's marks (2026-11-13 user decision), given by GameApp around the screens: `gleam` counts the clues recorded
 * in play (each new count gleams on the notebook's button, as clue_new plays); `unseen`: a clue was recorded since the
 * notebook was last opened (GameApp's per-tab memory, seen-marks.ts).
 */
export type NotebookCue = { gleam: number; unseen: boolean };
export const NotebookCueContext = createContext<NotebookCue>({ gleam: 0, unseen: false });

/**
 * Inside a 手がかり帳 button (an `fx-host`, wherever it shows: the header's tool, the observation's own): its キラリ as a
 * clue is recorded while it is on screen, and its dot until the notebook opens (read with its name: 「新しい手がかりあり」).
 */
export function NotebookCueMarks() {
  const { gleam, unseen } = useContext(NotebookCueContext);
  const playing = useCuePlaying(gleam, SPARKLE_MS);
  return <><Sparkle playing={playing} cue={gleam} />{unseen && <NewDot label="新しい手がかりあり" />}</>;
}
