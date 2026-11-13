import { INTRO_MILESTONES, type IntroMilestone, type IntroTiming } from "./intro-timing";

// 最初の3分の計測's words (2026-11-13; Debug mode only): loaded lazily by GameApp's ⚙設定 while Debug mode is on, so
// none of it is in the files the title page loads (scripts/dist-guard.ts lazyDebugMarkers).

const MILESTONE_JA: Readonly<Record<IntroMilestone, string>> = {
  choice: "最初の選択",
  quiz: "最初のクイズの答え",
  free: "最初の自由時間",
  date: "最初のデート",
};

/** A time as the note says it: 「2分10秒」, 「45秒」 (whole seconds). */
export function durationJa(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}分${seconds % 60}秒` : `${seconds}秒`;
}

/**
 * The measure in one line: 「導入の計測：最初の選択 2分10秒・34行、最初のクイズの答え …」, each milestone's time since
 * 「旅をはじめる」 and the lines read by then; with an opening movie also the time without it (「ムービーを除く 1分40秒」);
 * a milestone not reached yet is 「まだ」.
 */
export function introTimingJa(timing: IntroTiming): string {
  const parts = INTRO_MILESTONES.map((milestone) => {
    const mark = timing.marks[milestone];
    if (!mark) return `${MILESTONE_JA[milestone]} まだ`;
    const movie = mark.movieMs > 0 ? `（ムービーを除く ${durationJa(mark.atMs - mark.movieMs)}）` : "";
    return `${MILESTONE_JA[milestone]} ${durationJa(mark.atMs)}${movie}・${mark.lines}行`;
  });
  return `導入の計測：${parts.join("、")}`;
}

/**
 * The note in ⚙設定 → ゲームの設定 under 「Debugモード」 (Debug mode on): the measure since the last 「旅をはじめる」 in this
 * tab, or how to start one. Marked 「Debug」, as the relationship changes are; not a live region.
 */
export default function IntroTimingNote({ timing }: { timing: IntroTiming | null }) {
  return <section className="relationship-change debug-intro-timing" aria-label="Debug：導入の計測" data-testid="intro-timing">
    <span className="relationship-change-label" aria-hidden="true">Debug</span>
    <div className="relationship-change-lines">
      <p>{timing ? introTimingJa(timing) : "導入の計測：このタブで「旅をはじめる」から遊ぶと、最初の選択・クイズ・自由時間・デートまでの時間と読んだ行数が出ます（保存しません）。"}</p>
    </div>
  </section>;
}
