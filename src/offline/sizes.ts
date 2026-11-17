/**
 * How the sizes of 「オフラインで遊ぶ」 read on screen (user decisions 2026-11-17: no 「ダウンロード」, sizes rounded, in the
 * decimal megabytes phones show). Pure, and apart from plan.ts: the title page's own files hold these few lines for
 * ゲームの設定's summary, and nothing else of the work.
 */
const megabytes = (bytes: number) => bytes / 1_000_000;

/** A size as the screens write it: 「0.1 MB未満」, 「約4.5 MB」 under 10 MB, 「約170 MB」 above, 「約1.2 GB」 from 1,000 MB. */
export function formatOfflineSize(bytes: number): string {
  const size = megabytes(bytes);
  if (size < 0.1) return "0.1 MB未満";
  if (Number(size.toFixed(1)) < 10) return `約${size.toFixed(1)} MB`;
  if (Math.round(size) < 1000) return `約${Math.round(size)} MB`;
  return `約${(size / 1000).toFixed(1)} GB`;
}

/** How far a run is, in the unit of its whole: 「76 / 170 MB」, 「3.2 / 7.3 MB」 under 10 MB, 「0.4 / 1.2 GB」 from 1,000 MB. */
export function formatProgress(done: number, total: number): string {
  const whole = megabytes(total);
  if (Math.round(whole) >= 1000) return `${(megabytes(done) / 1000).toFixed(1)} / ${(whole / 1000).toFixed(1)} GB`;
  if (Number(whole.toFixed(1)) < 10) return `${megabytes(done).toFixed(1)} / ${whole.toFixed(1)} MB`;
  return `${Math.floor(megabytes(done))} / ${Math.round(whole)} MB`;
}

/** How far a run is in whole percent, never 100 before it is complete. */
export function progressPercent(done: number, total: number): number {
  if (total <= 0) return 100;
  return done >= total ? 100 : Math.min(99, Math.floor((done / total) * 100));
}
