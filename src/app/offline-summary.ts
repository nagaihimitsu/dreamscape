/**
 * What the game's own screens say of 「オフラインで遊ぶ」 (user request and decisions 2026-11-17), outside its dialog:
 * ゲームの設定's summary line, the title's hint while offline, the short words under the header while the player is
 * elsewhere, and the line 「保存データの消去」 adds. Pure. The dialog's own words are in offline-rows.ts, which loads with
 * the dialog; these few stay in the title page's files. No 「ダウンロード」「キャッシュ」 on screen (user decision).
 */
import type { OfflineEvent, OfflineSnapshot } from "../offline/offline-status";
import { formatOfflineSize, progressPercent } from "../offline/sizes";

/** A journey as these words need it. */
export type OfflineJourney = { id: string; nameJa: string; status: string };

/** The names of journeys, in the catalog's order. */
export const journeyNames = (ids: readonly string[], catalog: readonly OfflineJourney[]): string =>
  catalog.filter((journey) => ids.includes(journey.id)).map((journey) => journey.nameJa).join("、");

export const OFFLINE_UNSUPPORTED_JA = "このブラウザでは、端末に入れて遊ぶことはできません。";
export const OFFLINE_UNREADABLE_JA = "この端末に入っているオフライン用のデータを、この版では読み取れません。";

/** A run that stopped on a problem (not one the player stopped, and not one another tab's work refused): the dialog says what to do. */
function problemStop(snapshot: OfflineSnapshot): OfflineSnapshot["stop"] {
  const { stop } = snapshot;
  return stop && stop.reason !== "stopped" && stop.reason !== "other-tab" && stop.reason !== "other-tab-run" ? stop : null;
}

/**
 * ゲームの設定's line under 「オフライン」: what is kept, loading, stopped on a problem, left midway or on offer. `live`:
 * how far a run is, shown beside the line but not announced (the line is a status region). `entry`: whether the way
 * into the dialog shows.
 */
export function offlineSummary(snapshot: OfflineSnapshot, catalog: readonly OfflineJourney[]): { text: string; live?: string; entry: boolean } {
  if (snapshot.support === "unsupported") return { text: OFFLINE_UNSUPPORTED_JA, entry: false };
  if (snapshot.store === "unreadable") return { text: OFFLINE_UNREADABLE_JA, entry: true };
  const { run, installed } = snapshot;
  if (run) {
    const live = run.total > 0 ? `${progressPercent(run.done, run.total)}%` : undefined;
    const text = run.journeyId !== null ? `入れています：${journeyNames([run.journeyId], catalog)}`
      : `${run.kind === "repair" ? "足りないファイルを入れ直しています" : "新しい版の分を入れています"}：${journeyNames(installed, catalog)}`;
    return { text, ...(live ? { live } : {}), entry: true };
  }
  const parts: string[] = [];
  if (installed.length) {
    const names = journeyNames(installed, catalog);
    parts.push(snapshot.newer ? `新しい版の分があります：${names}（${formatOfflineSize(snapshot.pending)}）`
      : snapshot.pending > 0 ? `一部のファイルが端末からなくなっています：${names}（${formatOfflineSize(snapshot.pending)}）`
        : `この端末に入っています：${names}`);
  }
  // A run that stopped on a problem is not merely "left midway": the player may believe the journey is in.
  const stop = problemStop(snapshot);
  if (stop) {
    const what = stop.journeyId !== null ? journeyNames([stop.journeyId], catalog) : snapshot.newer ? "新しい版の分" : "足りないファイル";
    parts.push(`入れるのが止まりました：${what}（「オフラインで遊ぶ」で確かめてください）`);
  }
  const partial = snapshot.partial.filter((journeyId) => journeyId !== stop?.journeyId);
  if (partial.length) parts.push(`途中まで入っています：${journeyNames(partial, catalog)}`);
  return { text: parts.length ? parts.join("。") : "旅行編をこの端末に入れておくと、通信がなくても遊べます。", entry: true };
}

/**
 * The title's words for screen readers (a status region no one sees): the same as ゲームの設定's line, while there is
 * something to say (a run in flight, a journey kept, left midway or stopped on a problem, or data this version cannot
 * read); null otherwise. A run goes on when 「オフラインで遊ぶ」 is closed, and the title is where a first visit waits
 * for it; what the eye gets is the mark on the entry (offlineEntryMark).
 */
export function offlineTitleStatus(snapshot: OfflineSnapshot, catalog: readonly OfflineJourney[]): { text: string } | null {
  if (snapshot.support !== "ok") return null;
  if (!snapshot.run && !snapshot.installed.length && !snapshot.partial.length && snapshot.store !== "unreadable" && !problemStop(snapshot)) return null;
  return { text: offlineSummary(snapshot, catalog).text };
}

/**
 * The short word the title's way into 「オフラインで遊ぶ」 carries in brackets while there is something to say: how far a
 * run is, that it stopped on a problem, that a journey was left midway, that a newer build or missing files are on
 * offer, or that a journey is on the device. Short, so the entry stays on the caption's row at 320 px: no line is
 * added above 「旅をはじめる」.
 */
export function offlineEntryMark(snapshot: OfflineSnapshot): string | null {
  if (snapshot.support !== "ok") return null;
  const { run } = snapshot;
  if (run) return run.total > 0 ? `${progressPercent(run.done, run.total)}%` : "入れています";
  if (problemStop(snapshot)) return "止まりました";
  if (snapshot.partial.length) return "途中まで";
  if (!snapshot.installed.length) return null;
  return snapshot.newer ? "新しい版あり" : snapshot.pending > 0 ? "足りない分あり" : "入っています";
}

/**
 * The title's line under the journey choice: only without a network, on a device that keeps a journey, when the chosen
 * one is not kept (its code opens, its pictures and sounds do not).
 */
export function offlineTitleHint(snapshot: OfflineSnapshot, online: boolean, journeyId: string): string | null {
  return !online && snapshot.installed.length > 0 && !snapshot.installed.includes(journeyId)
    ? "この旅行編は端末に入っていないため、通信がないと絵や音が出ません。" : null;
}

/** The short word under the header for what happened to a journey's loading while the player was elsewhere in the game. */
export function offlineToast(event: OfflineEvent, catalog: readonly OfflineJourney[]): string {
  const name = journeyNames([event.journeyId], catalog) || "旅行編";
  if (event.type === "done") return `${name}を、この端末に入れ終えました。`;
  if (event.reason === "quota") return `空きが足りないため、${name}を入れるのを止めました。`;
  if (event.reason === "offline") return `通信が切れたため、${name}を入れるのを止めました。`;
  return `${name}を入れるのが止まりました。「オフラインで遊ぶ」で確かめてください。`;
}

/** What 「保存データの消去」's confirmation adds on a device that keeps a journey (or part of one): those files are no save. */
export function offlineDeleteNote(snapshot: OfflineSnapshot): string | null {
  return snapshot.installed.length || snapshot.partial.length ? "この端末に入れた旅行編のファイル（オフラインで遊ぶ）は消えません。" : null;
}
