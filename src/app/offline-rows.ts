/**
 * What the dialog 「オフラインで遊ぶ」 shows (user request and decisions 2026-11-17), from what the page knows of the
 * store (src/offline/offline-status.ts): one row per playable journey with its state, sizes and buttons, a block for
 * the kept journeys' newer or missing files, the confirmations' words. Pure, with every Japanese text of the dialog:
 * OfflinePlayDialog.tsx only lays these out. No 「ダウンロード」「キャッシュ」 on screen; sizes are read from the build's
 * list, never written here.
 */
import type { OfflineSnapshot, OfflineStop } from "../offline/offline-status";
import { formatOfflineSize, formatProgress, progressPercent } from "../offline/sizes";
import { journeyNames, OFFLINE_UNREADABLE_JA, OFFLINE_UNSUPPORTED_JA, type OfflineJourney } from "./offline-summary";

/** What a button of the dialog does. */
export type OfflineActionId = "keep" | "resume" | "stop" | "update" | "remove";
export type OfflineAction = { id: OfflineActionId; label: string };
/** A result or a problem, shown until the next action (never by itself gone); `reload`: with a button that loads the page anew. */
export type OfflineNotice = { role: "status" | "alert"; text: string; reload?: boolean };

/** What a row says: `line` is announced; `live` (how far a run is) is shown beside it and not announced; `spoken` is announced at each quarter. */
type RowText = { line: string; live?: string; spoken?: string; progress?: { done: number; total: number }; notice?: OfflineNotice; actions: OfflineAction[] };

export type OfflineRow = RowText & {
  journeyId: string;
  nameJa: string;
  /**
   * "none": not kept; "running": being loaded; "partial": left midway; "held": complete; "waiting": another run goes
   * first; "offline": cannot be loaded now; "other-tab": another tab is at work.
   */
  kind: "none" | "running" | "partial" | "held" | "waiting" | "offline" | "other-tab";
};

/** Everything the device holds (the journeys, the files they share, the fonts), removed at once (user request 2026-11-25). */
export type OfflineAllRow = RowText & { kind: "all"; heading: string };

/** The kept journeys' newer build or missing files: on offer, being loaded, or loaded for the next start. */
export type OfflineVersionRow = RowText & { kind: "update" | "updating" | "missing" | "repairing" | "switched"; heading: string };

export type OfflineView = {
  /** Instead of the rows: the browser cannot keep a journey, this is the development server, or the store cannot be read (`removeAll`: the one thing left to do). */
  blocked: { role: "status" | "alert"; text: string; removeAll: boolean } | null;
  /** What the dialog is for; empty where the browser cannot keep a journey (nothing will be put on this device). */
  lead: string;
  /** A result or problem of no single journey (the newer build's files, the removal of everything). */
  notice?: OfflineNotice;
  version: OfflineVersionRow | null;
  rows: OfflineRow[];
  /** The removal of everything this version reads, under the journeys' rows (not while a run or another tab is at work). */
  all: OfflineAllRow | null;
  /** What to know before and while keeping; then what the device holds and what still needs a network. */
  advice: string;
  foot: string[];
};

const LEAD_JA = "選んだ旅行編の絵・音・声・音楽・ムービー・物語を、この端末に入れておきます。入れ終えると、通信がなくても、通信があるときと同じように遊べます。";
const ADVICE_JA = "大きいので、Wi-Fiにつながっているときをおすすめします。入れている間も遊べます。この画面を閉じても続きますが、ページを閉じると止まります（入れた分は残り、続きから入れられます）。";
const ONLINE_ONLY_JA = "通信がないときは、地図の背景（道や地形）は出ません。行き先は写真の札から選べます。英語の読み上げは、端末によっては通信が必要です。";
const NOT_PERSISTED_JA = "ブラウザは、端末の空きが少なくなると、入れたファイルを消すことがあります。そのときは、もう一度入れてください。";
const NO_FONTS_JA = "文字の形（フォント）は入れられませんでした。通信がないときは、端末にある文字で表示します。通信があるときにページを開くと、もう一度入れます。";
const FONTS_LOADING_JA = "文字の形（フォント）を入れています。入れ終えるまで、ページを開いたまま通信を切らないでください。";
const WAITING_JA = "通信を待っています";
const SAVES_STAY_JA = "保存データ（ゲームの進行）・クイズと旅のことばの記録・設定は";

const REMOVE: OfflineAction = { id: "remove", label: "端末から消す" };
const STOP: OfflineAction = { id: "stop", label: "止める" };

/**
 * The bytes a run for `journeyId` is for (`total`) and those of them still to load (`missing`): the shared files, the
 * installed journeys' and its own, without what the installed build already holds on the device. The run's own
 * progress counts toward the same whole (plan.ts runFiles).
 */
function runSizes(snapshot: OfflineSnapshot, journeyId: string | null): { total: number; missing: number } | null {
  const { sizes } = snapshot;
  if (!sizes) return null;
  const own = [...snapshot.installed, ...(journeyId === null ? [] : [journeyId])].map((id) => sizes.journeys[id]);
  if (own.some((size) => !size)) return null;
  return {
    total: sizes.shared + own.reduce((sum, size) => sum + size.own, 0) - sizes.held,
    missing: sizes.sharedMissing + own.reduce((sum, size) => sum + size.ownMissing, 0),
  };
}

/** How far a run is: beside the line (not announced), and its quarter for the announced part. */
function runText(run: NonNullable<OfflineSnapshot["run"]>): Pick<RowText, "live" | "spoken" | "progress"> {
  if (run.total <= 0) return {};
  const percent = progressPercent(run.done, run.total);
  const quarter = Math.floor(percent / 25) * 25;
  return {
    live: `${percent}%（${formatProgress(run.done, run.total)}）`,
    ...(quarter > 0 && quarter < 100 ? { spoken: `${quarter}%` } : {}),
    progress: { done: run.done, total: run.total },
  };
}

/** Why a run or a removal stopped; `retry`: the button that takes it up again, as its row names it. */
function stopNotice(stop: OfflineStop, retry: string, begun: boolean): OfflineNotice {
  const size = (bytes: number | undefined) => formatOfflineSize(bytes ?? 0);
  switch (stop.reason) {
    case "stopped": return { role: "status", text: begun ? "止めました。入れた分は残っています。" : "止めました。" };
    case "offline": return { role: "alert", text: "通信が切れたため、止まりました。このページを開いたまま通信が戻ると、続きを入れます。" };
    case "reload": return {
      role: "alert", reload: true,
      text: begun ? `ゲームが更新されたため、止まりました。ページを読み込み直してから「${retry}」を押してください（入れた分はそのまま使います）。`
        : `ゲームが更新されています。ページを読み込み直してから、もう一度「${retry}」を押してください。`,
    };
    case "mismatch": return { role: "alert", text: `ファイルを正しく読み込めませんでした。時間をおいて「${retry}」を押してください。` };
    case "no-space": {
      // The room the run asks for (its files and a margin), in whole megabytes: the need rounded up and the room down,
      // so the two never read as the same figure.
      const megabyte = 1_000_000;
      const needed = Math.ceil((stop.needed ?? 0) / megabyte) * megabyte;
      const free = (stop.free ?? 0) < megabyte ? stop.free : Math.floor((stop.free ?? 0) / megabyte) * megabyte;
      return { role: "alert", text: `この端末の空きが足りないため、入れられません（${size(needed)} の空きが要ります。使える空きは${size(free)} です）。` };
    }
    case "quota": return {
      role: "alert",
      text: `この端末の空きが足りなくなったため、止まりました${stop.needed === undefined ? "" : `（あと${size(stop.needed)} 要ります）`}。空きを作ってから「${retry}」を押してください。`,
    };
    case "storage": return { role: "alert", text: "この端末に書き込めなかったため、止まりました。" };
    case "other-tab": return { role: "alert", text: "別のタブで入れている間は消せません。" };
    case "other-tab-run": return { role: "alert", text: "別のタブで入れているため、今は入れられません。" };
  }
}

/** What a removal freed; `reload`: the page runs another build than the site's and has lost its later parts with it. */
function removedNotice(result: { bytes?: number; reload?: boolean }): OfflineNotice {
  const text = result.bytes ? `端末から消しました（${formatOfflineSize(result.bytes)}）。` : "端末から消しました。";
  return result.reload ? { role: "status", reload: true, text: `${text}ゲームが新しくなっているので、ページを読み込み直してください。` } : { role: "status", text };
}

function journeyRow(snapshot: OfflineSnapshot, journey: OfflineJourney): OfflineRow {
  const { run, sizes, installed, partial } = snapshot;
  const base = { journeyId: journey.id, nameJa: journey.nameJa };
  const own = sizes?.journeys[journey.id];
  const begun = partial.includes(journey.id);
  const retry = begun ? "続きを入れる" : "この端末に入れる";
  const notice = snapshot.stop?.journeyId === journey.id ? stopNotice(snapshot.stop, retry, begun)
    : snapshot.result?.journeyId !== journey.id ? undefined
      // (The row's own line says that it plays without a network.)
      : snapshot.result.kind === "done" ? { role: "status" as const, text: "入れ終えました。" } : removedNotice(snapshot.result);
  const withNotice = notice ? { notice } : {};
  if (run?.journeyId === journey.id) return { ...base, kind: "running", line: run.waiting ? `入れています（${WAITING_JA}）` : "入れています", ...runText(run), actions: [STOP] };
  if (installed.includes(journey.id)) {
    // The size of what this journey holds: with the shared files when it is the only one kept.
    const alone = installed.length === 1 && !partial.length;
    const size = !sizes || !own ? "" : alone ? `（${formatOfflineSize(sizes.shared + own.own)}）` : `（${formatOfflineSize(own.own)}。ほかの旅行編と共通の分を除く）`;
    // Files that went missing: the journey may not play whole without a network until they are loaded again.
    const whole = snapshot.newer || snapshot.pending === 0;
    return { ...base, kind: "held", line: `この端末に入っています${size}。${whole ? "通信がなくても遊べます。" : ""}`, ...withNotice, actions: run ? [] : [REMOVE] };
  }
  if (run) {
    const first = run.journeyId !== null ? "ほかの旅行編を入れ終えてから" : run.kind === "repair" ? "足りないファイルを入れ直してから" : "新しい版の分を入れ終えてから";
    return { ...base, kind: "waiting", line: `${first}選べます。`, actions: [] };
  }
  if (snapshot.otherTab) return { ...base, kind: "other-tab", line: "別のタブで入れています。", ...withNotice, actions: [] };
  const load = runSizes(snapshot, journey.id);
  const startable = snapshot.reachable && !!load;
  if (begun) {
    if (!startable) return { ...base, kind: "partial", line: "途中まで入っています。通信がないため、今は続きを入れられません。", ...withNotice, actions: [REMOVE] };
    return {
      ...base, kind: "partial", line: `途中まで入っています（${formatProgress(load.total - load.missing, load.total)}）。`, ...withNotice,
      actions: [{ id: "resume", label: "続きを入れる" }, REMOVE],
    };
  }
  if (!startable) return { ...base, kind: "offline", line: "通信がないため、今は入れられません。", ...withNotice, actions: [] };
  return { ...base, kind: "none", line: `この端末には入っていません。入れると${formatOfflineSize(load.missing)}です${keepNote(snapshot, "row")}。`, ...withNotice, actions: [{ id: "keep", label: "この端末に入れる" }] };
}

/** What the size of a journey to keep includes, beside its own files. */
function keepNote(snapshot: OfflineSnapshot, where: "row" | "confirm"): string {
  if (snapshot.installed.length && snapshot.newer) return `（入っている旅行編の新しい版の分 ${formatOfflineSize(snapshot.pending)} を含みます）`;
  if (snapshot.installed.length && snapshot.sizes?.sharedMissing === 0) return "（ほかの旅行編と共通の分は入っています）";
  return where === "confirm" ? "（ほかの旅行編と共通の分を含みます）" : "";
}

function versionRow(snapshot: OfflineSnapshot): OfflineVersionRow | null {
  const { run } = snapshot;
  if (!snapshot.installed.length || run?.journeyId != null) return null;
  if (run) {
    const waiting = run.waiting ? `${WAITING_JA}。` : "";
    return run.kind === "repair"
      ? { kind: "repairing", heading: "足りないファイル", line: `足りないファイルを入れ直しています。${waiting}`, ...runText(run), actions: [STOP] }
      : { kind: "updating", heading: "新しい版", line: `新しい版の分を入れています。終わるまでは今の版で遊べます。${waiting}`, ...runText(run), actions: [STOP] };
  }
  const startable = snapshot.reachable && !snapshot.otherTab;
  if (snapshot.newer) {
    return {
      kind: "update", heading: "新しい版", line: `新しい版の分（${formatOfflineSize(snapshot.pending)}）があります。入れ終えるまでは、今の版で遊べます。`,
      actions: startable ? [{ id: "update", label: "新しい版の分を入れる" }] : [],
    };
  }
  if (snapshot.pending > 0) {
    return {
      kind: "missing", heading: "足りないファイル",
      line: `一部のファイルが端末からなくなっています（${formatOfflineSize(snapshot.pending)}）。${snapshot.reachable ? "" : "通信があるときに入れ直せます。"}`,
      actions: startable ? [{ id: "update", label: "入れ直す" }] : [],
    };
  }
  if (snapshot.switched) return { kind: "switched", heading: "新しい版", line: "新しい版を入れ終えました。次にページを開いたときから、新しい版で遊べます。", actions: [] };
  return null;
}

function allRow(snapshot: OfflineSnapshot): OfflineAllRow | null {
  const held = snapshot.installed.length + snapshot.partial.length > 0 || snapshot.storedBytes > 0;
  if (snapshot.store !== "kept" || !held || snapshot.run || snapshot.otherTab) return null;
  return { kind: "all", heading: "この端末に入れたファイル", line: "入れた旅行編と、共通のファイル・文字の形（フォント）を、まとめて消せます。", actions: [{ id: "remove", label: "すべて消す" }] };
}

/** The dialog's list step. `catalog`: the journeys in the title's order; only the playable ones have a row. */
export function offlineRows(snapshot: OfflineSnapshot, catalog: readonly OfflineJourney[]): OfflineView {
  const view = { lead: LEAD_JA, version: null, rows: [], all: null, advice: ADVICE_JA, foot: [ONLINE_ONLY_JA] };
  if (snapshot.support === "unsupported") return { ...view, lead: "", blocked: { role: "status", text: OFFLINE_UNSUPPORTED_JA, removeAll: false } };
  if (snapshot.support === "development") return { ...view, blocked: { role: "status", text: "開発用のサーバーでは使えません。公開版（本番ビルド）で使えます。", removeAll: false } };
  if (snapshot.store === "unknown") return { ...view, blocked: { role: "status", text: "この端末に入っているものを確かめています。", removeAll: false } };
  // The removal of everything, or a problem of the kept journeys' newer files: no journey's row holds it.
  const notice = snapshot.stop?.journeyId === null ? stopNotice(snapshot.stop, snapshot.newer ? "新しい版の分を入れる" : "入れ直す", true)
    : snapshot.result?.journeyId !== null ? undefined
      : snapshot.result.kind === "removed" ? removedNotice(snapshot.result)
        // (When the newer build opens only at the next start, its own block says so.)
        : snapshot.switched ? undefined : { role: "status" as const, text: snapshot.result.run === "repair" ? "足りないファイルを入れ直しました。" : "新しい版の分を入れ終えました。" };
  if (snapshot.store === "unreadable") return { ...view, blocked: { role: "alert", text: OFFLINE_UNREADABLE_JA, removeAll: true }, ...(notice ? { notice } : {}) };
  const kept = snapshot.installed.length > 0;
  return {
    ...view, blocked: null, ...(notice ? { notice } : {}),
    version: versionRow(snapshot),
    rows: catalog.filter((journey) => journey.status === "available").map((journey) => journeyRow(snapshot, journey)),
    all: allRow(snapshot),
    foot: [
      ...(snapshot.storedBytes > 0 ? [`この端末に入れたファイル：${formatOfflineSize(snapshot.storedBytes)}`] : []),
      ONLINE_ONLY_JA,
      ...(kept && snapshot.persisted === false ? [NOT_PERSISTED_JA] : []),
      ...(kept && snapshot.fonts === "loading" ? [FONTS_LOADING_JA] : kept && snapshot.fonts === "none" && !snapshot.run ? [NO_FONTS_JA] : []),
    ],
  };
}

/** A confirmation: its title, what it says, the line of what stays untouched, and its two answers (the one that changes nothing first). */
export type OfflineConfirm = { title: string; body: string[]; fine: string; cancel: string; action: string; danger: boolean };

/** Before a journey is kept: what will be loaded and how large it is (null when it cannot be loaded now). */
export function keepConfirm(snapshot: OfflineSnapshot, catalog: readonly OfflineJourney[], journeyId: string): OfflineConfirm | null {
  const load = runSizes(snapshot, journeyId);
  if (!load || !snapshot.reachable) return null;
  const fonts = snapshot.fonts === "kept" ? "" : "文字の形（フォント）も一緒に入れます。";
  return {
    title: `${journeyNames([journeyId], catalog)}をこの端末に入れますか？`,
    body: [
      `絵・音・声・音楽・ムービー・物語など、${formatOfflineSize(load.missing)}をこの端末に入れます${keepNote(snapshot, "confirm")}。${fonts}Wi-Fiにつながっているときをおすすめします。`,
      "入れている間も遊べます。止めても、続きから入れられます。",
      "ゲームが新しくなったときは、通信があるときに変わった分だけを入れ直します（約30 MBまでは自動で、それより大きいときはここで選べます）。",
    ],
    fine: `${SAVES_STAY_JA}変わりません。`,
    cancel: "やめる", action: "入れる", danger: false,
  };
}

/** Before a journey is removed ("all": everything, of a store this version reads or of one it cannot read): what goes, what stays, how to get it back. */
export function removeConfirm(snapshot: OfflineSnapshot, catalog: readonly OfflineJourney[], target: string | "all"): OfflineConfirm {
  const answers = { fine: `${SAVES_STAY_JA}消えません。`, cancel: "消さずに戻る", action: "端末から消す", danger: true };
  if (target === "all" && snapshot.store !== "unreadable") {
    const names = journeyNames([...snapshot.installed, ...snapshot.partial], catalog);
    const size = snapshot.storedBytes ? `（${formatOfflineSize(snapshot.storedBytes)}）` : "";
    const outdated = snapshot.reachable && (snapshot.newer || snapshot.switched);
    const online = outdated ? "ゲームが新しくなっているので、消したあとはページを読み込み直してください（通信があれば、新しい版でこれまでどおり遊べます）。" : "通信があれば、これまでどおり遊べます。";
    return {
      title: "この端末に入れたファイルを、すべて消しますか？",
      body: [
        `この端末に入れた${names ? `${names}の` : ""}絵・音・声・ムービー・物語と、共通のファイル${size}を、すべて消します。文字の形（フォント）も消します。`,
        `${snapshot.installed.length ? "通信がない間は、入れた旅行編を遊べなくなります。" : ""}${online}もう一度入れるときは、最初から読み込みます。`,
      ],
      ...answers,
    };
  }
  if (target === "all") {
    return {
      title: "端末に入れたオフライン用のファイルを、すべて消しますか？",
      body: [
        "この端末に入っているオフライン用のデータを、すべて消します（この版では読み取れないため、旅行編ごとには選べません）。",
        "通信があれば、これまでどおり遊べます。新しく入れ直すこともできます。",
      ],
      ...answers,
    };
  }
  const name = journeyNames([target], catalog);
  const { sizes, storedBy } = snapshot;
  const own = sizes?.journeys[target];
  const complete = snapshot.installed.includes(target);
  const others = [...snapshot.installed, ...snapshot.partial].filter((id) => id !== target);
  // What goes is what the device holds (of whatever build), not what the list a run would load names.
  const size = (bytes: number | undefined) => (bytes ? `（${formatOfflineSize(bytes)}）` : "");
  const ownSize = size(storedBy.journeys[target]);
  const sharedSize = size(storedBy.shared);
  const again = own && sizes ? `（また${formatOfflineSize(own.own + (others.length ? 0 : sizes.shared))}を読み込みます）` : "";
  // Everything goes while this page runs another build than the site's: the page is loaded anew afterwards (its own later parts go too).
  const outdated = !others.length && snapshot.reachable && (snapshot.newer || snapshot.switched);
  const online = outdated ? "ゲームが新しくなっているので、消したあとはページを読み込み直してください（通信があれば、新しい版でこれまでどおり遊べます）。" : "通信があれば、これまでどおり遊べます。";
  return {
    title: `${name}をこの端末から消しますか？`,
    body: [
      `${complete ? "この端末に入れた" : "途中まで入れた"}${name}の絵・音・声・ムービー・物語${ownSize}を消します。`,
      others.length ? `ほかの旅行編と共通のファイル${sharedSize}は、${journeyNames(others, catalog)}が使うので残ります。` : `ほかの旅行編と共通のファイル${sharedSize}も消します。`,
      complete ? `通信がない間は、この旅行編を遊べなくなります。${online}もう一度入れることもできます${again}。`
        : `${online}もう一度入れるときは、最初から読み込みます。`,
    ],
    ...answers,
  };
}
