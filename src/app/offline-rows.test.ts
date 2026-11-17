import { describe, expect, it } from "vitest";
import type { OfflineSnapshot } from "../offline/offline-status";
import { keepConfirm, offlineRows, removeConfirm, type OfflineRow } from "./offline-rows";
import { offlineDeleteNote, offlineEntryMark, offlineSummary, offlineTitleHint, offlineTitleStatus, offlineToast } from "./offline-summary";

// What 「オフラインで遊ぶ」 says on screen (user decisions 2026-11-17): each row's state, sizes and buttons, the
// confirmations, ゲームの設定's line. Every size comes from what the page knows of the build's list, none is written here.
const catalog = [
  { id: "milano", nameJa: "ミラノ編", status: "available" },
  { id: "golden_triangle", nameJa: "インド・ゴールデントライアングル編", status: "available" },
  { id: "uzbekistan", nameJa: "ウズベキスタン編", status: "preparing" },
];
/** A build like today's: 37.7 MB shared, Milano 7.3 MB, the golden triangle 133.1 MB. `held`: what the installed build already holds of it. */
const sizes = (missing: { shared?: number; milano?: number; golden_triangle?: number } = {}, held = 0) => ({
  shared: 37_700_000, sharedMissing: missing.shared ?? 37_700_000, held,
  journeys: {
    milano: { own: 7_300_000, ownMissing: missing.milano ?? 7_300_000 },
    golden_triangle: { own: 133_100_000, ownMissing: missing.golden_triangle ?? 133_100_000 },
  },
});
const snapshot = (change: Partial<OfflineSnapshot> = {}): OfflineSnapshot => ({
  support: "ok", store: "none", installed: [], partial: [], sizes: sizes(), reachable: true, newer: false, pending: 0, switched: false, storedBytes: 0,
  storedBy: { shared: 0, journeys: {} }, run: null, otherTab: false, stop: null, result: null, persisted: null, fonts: "none", ...change,
});
const milanoKept = (change: Partial<OfflineSnapshot> = {}) => snapshot({
  store: "kept", installed: ["milano"], sizes: sizes({ shared: 0, milano: 0 }, 45_000_000), storedBytes: 45_000_000,
  storedBy: { shared: 37_700_000, journeys: { milano: 7_300_000 } }, fonts: "kept", ...change,
});
const bothKept = (change: Partial<OfflineSnapshot> = {}) => milanoKept({
  installed: ["milano", "golden_triangle"], sizes: sizes({ shared: 0, milano: 0, golden_triangle: 0 }, 178_100_000), storedBytes: 178_100_000,
  storedBy: { shared: 37_700_000, journeys: { milano: 7_300_000, golden_triangle: 133_100_000 } }, ...change,
});
const row = (state: OfflineSnapshot, journeyId: string): OfflineRow => offlineRows(state, catalog).rows.find((one) => one.journeyId === journeyId)!;
const labels = (one: { actions: { label: string }[] }) => one.actions.map((action) => action.label);

describe("the rows of the dialog", () => {
  it("lists the playable journeys in the title's order, never one in preparation", () => {
    expect(offlineRows(snapshot(), catalog).rows.map((one) => [one.journeyId, one.nameJa])).toEqual([["milano", "ミラノ編"], ["golden_triangle", "インド・ゴールデントライアングル編"]]);
  });

  it("says what a journey not kept would take, with the shared files only where they are still to load", () => {
    expect(row(snapshot(), "milano")).toMatchObject({ kind: "none", line: "この端末には入っていません。入れると約45 MBです。" });
    expect(labels(row(snapshot(), "milano"))).toEqual(["この端末に入れる"]);
    expect(row(snapshot(), "golden_triangle").line).toBe("この端末には入っていません。入れると約171 MBです。");
    // Milano is kept: the golden triangle costs its own files only.
    expect(row(milanoKept(), "golden_triangle").line).toBe("この端末には入っていません。入れると約133 MBです（ほかの旅行編と共通の分は入っています）。");
    // A newer build is on the site: keeping another journey loads the kept one's changed files too.
    const newer = milanoKept({ newer: true, pending: 35_000_000, sizes: sizes({ shared: 30_000_000, milano: 5_000_000 }, 10_000_000) });
    expect(row(newer, "golden_triangle").line).toBe("この端末には入っていません。入れると約168 MBです（入っている旅行編の新しい版の分 約35 MB を含みます）。");
  });

  it("shows a run with its numbers beside the line, announced only at each quarter, and one button: 止める", () => {
    const running = snapshot({ store: "kept", run: { kind: "first", journeyId: "milano", done: 20_250_000, total: 45_000_000 } });
    expect(row(running, "milano")).toEqual({
      journeyId: "milano", nameJa: "ミラノ編", kind: "running", line: "入れています", live: "45%（20 / 45 MB）", spoken: "25%",
      progress: { done: 20_250_000, total: 45_000_000 }, actions: [{ id: "stop", label: "止める" }],
    });
    // Before the list is read the size of the whole is not known yet: the line alone.
    expect(row(snapshot({ run: { kind: "first", journeyId: "milano", done: 0, total: 0 } }), "milano")).toEqual({
      journeyId: "milano", nameJa: "ミラノ編", kind: "running", line: "入れています", actions: [{ id: "stop", label: "止める" }],
    });
    // The other journey waits, with no button; a kept one cannot be removed meanwhile.
    expect(row(running, "golden_triangle")).toMatchObject({ kind: "waiting", line: "ほかの旅行編を入れ終えてから選べます。", actions: [] });
    // A journey added to a kept one: the run counts toward the size its row and its confirmation named, not the whole the device then holds.
    const adding = milanoKept({ run: { kind: "add", journeyId: "golden_triangle", done: 0, total: 133_100_000 } });
    expect(row(adding, "milano")).toMatchObject({ kind: "held", actions: [] });
    expect(row(adding, "golden_triangle")).toMatchObject({ live: "0%（0 / 133 MB）" });
    expect(row(adding, "golden_triangle").spoken).toBeUndefined();
  });

  it("says that a run waits for the network when a file does not arrive", () => {
    const waiting = snapshot({ store: "kept", run: { kind: "first", journeyId: "milano", done: 20_250_000, total: 45_000_000, waiting: true } });
    expect(row(waiting, "milano")).toMatchObject({ kind: "running", line: "入れています（通信を待っています）", live: "45%（20 / 45 MB）", actions: [{ id: "stop", label: "止める" }] });
    const updating = milanoKept({ newer: true, pending: 7_000_000, run: { kind: "update", journeyId: null, done: 0, total: 7_000_000, waiting: true } });
    expect(offlineRows(updating, catalog).version?.line).toBe("新しい版の分を入れています。終わるまでは今の版で遊べます。通信を待っています。");
  });

  it("offers to continue or remove a journey left midway", () => {
    const partial = snapshot({ store: "kept", partial: ["golden_triangle"], sizes: sizes({ shared: 0, golden_triangle: 94_800_000 }), storedBytes: 76_000_000 });
    expect(row(partial, "golden_triangle")).toMatchObject({ kind: "partial", line: "途中まで入っています（76 / 171 MB）。" });
    expect(labels(row(partial, "golden_triangle"))).toEqual(["続きを入れる", "端末から消す"]);
    // Without a network it can only be removed.
    const offline = { ...partial, reachable: false };
    expect(row(offline, "golden_triangle")).toMatchObject({ kind: "partial", line: "途中まで入っています。通信がないため、今は続きを入れられません。" });
    expect(labels(row(offline, "golden_triangle"))).toEqual(["端末から消す"]);
    // Left midway beside a kept journey: how far it is of its own files, as its run will count.
    const second = milanoKept({ partial: ["golden_triangle"], sizes: sizes({ shared: 0, milano: 0, golden_triangle: 94_800_000 }, 45_000_000) });
    expect(row(second, "golden_triangle").line).toBe("途中まで入っています（38 / 133 MB）。");
  });

  it("says a kept journey plays without a network, with its size", () => {
    expect(row(milanoKept(), "milano")).toMatchObject({ kind: "held", line: "この端末に入っています（約45 MB）。通信がなくても遊べます。" });
    expect(labels(row(milanoKept(), "milano"))).toEqual(["端末から消す"]);
    const both = bothKept();
    expect(row(both, "milano").line).toBe("この端末に入っています（約7.3 MB。ほかの旅行編と共通の分を除く）。通信がなくても遊べます。");
    expect(row(both, "golden_triangle").line).toBe("この端末に入っています（約133 MB。ほかの旅行編と共通の分を除く）。通信がなくても遊べます。");
    // Files went missing: no promise until they are loaded again.
    expect(row(milanoKept({ pending: 3_000_000 }), "milano").line).toBe("この端末に入っています（約45 MB）。");
  });

  it("cannot start anything without the site's list", () => {
    const offline = snapshot({ sizes: null, reachable: false });
    expect(row(offline, "milano")).toMatchObject({ kind: "offline", line: "通信がないため、今は入れられません。", actions: [] });
    // A kept journey can still be removed.
    expect(labels(row(milanoKept({ reachable: false }), "milano"))).toEqual(["端末から消す"]);
    expect(row(milanoKept({ reachable: false }), "golden_triangle").kind).toBe("offline");
  });

  it("gives way to another tab that is at work", () => {
    const other = milanoKept({ otherTab: true });
    expect(row(other, "golden_triangle")).toMatchObject({ kind: "other-tab", line: "別のタブで入れています。", actions: [] });
    expect(row({ ...other, stop: { journeyId: "milano", reason: "other-tab" } }, "milano").notice).toEqual({ role: "alert", text: "別のタブで入れている間は消せません。" });
    // A journey asked for while the other tab works is told so in words of its own (nothing was to be removed).
    expect(row({ ...other, stop: { journeyId: "golden_triangle", reason: "other-tab-run" } }, "golden_triangle").notice)
      .toEqual({ role: "alert", text: "別のタブで入れているため、今は入れられません。" });
  });
});

describe("results and problems, in the journey's row", () => {
  const stopped = (stop: OfflineSnapshot["stop"], change: Partial<OfflineSnapshot> = {}) =>
    row(snapshot({ store: "kept", partial: ["milano"], sizes: sizes({ shared: 0 }), ...change, stop }), "milano").notice;

  it("says why a run stopped and what to do", () => {
    expect(stopped({ journeyId: "milano", reason: "stopped" })).toEqual({ role: "status", text: "止めました。入れた分は残っています。" });
    expect(stopped({ journeyId: "milano", reason: "offline" })).toEqual({ role: "alert", text: "通信が切れたため、止まりました。このページを開いたまま通信が戻ると、続きを入れます。" });
    expect(stopped({ journeyId: "milano", reason: "mismatch" })).toEqual({ role: "alert", text: "ファイルを正しく読み込めませんでした。時間をおいて「続きを入れる」を押してください。" });
    expect(stopped({ journeyId: "milano", reason: "quota", needed: 88_000_000 }))
      .toEqual({ role: "alert", text: "この端末の空きが足りなくなったため、止まりました（あと約88 MB 要ります）。空きを作ってから「続きを入れる」を押してください。" });
    // (What is left is not always known: the device filled up at the run's first write.)
    expect(stopped({ journeyId: "milano", reason: "quota" }))
      .toEqual({ role: "alert", text: "この端末の空きが足りなくなったため、止まりました。空きを作ってから「続きを入れる」を押してください。" });
    expect(stopped({ journeyId: "milano", reason: "storage" })).toEqual({ role: "alert", text: "この端末に書き込めなかったため、止まりました。" });
    expect(stopped({ journeyId: "milano", reason: "reload" })).toEqual({
      role: "alert", reload: true, text: "ゲームが更新されたため、止まりました。ページを読み込み直してから「続きを入れる」を押してください（入れた分はそのまま使います）。",
    });
  });

  it("names the button of a journey of which nothing is loaded yet", () => {
    const fresh = { partial: [], sizes: sizes(), store: "none" as const };
    expect(stopped({ journeyId: "milano", reason: "stopped" }, fresh)).toEqual({ role: "status", text: "止めました。" });
    expect(stopped({ journeyId: "milano", reason: "reload" }, fresh))
      .toEqual({ role: "alert", reload: true, text: "ゲームが更新されています。ページを読み込み直してから、もう一度「この端末に入れる」を押してください。" });
    // The room the run asks for (its files and a margin), never a figure below the room the device has.
    const refused = (needed: number, free: number) => stopped({ journeyId: "milano", reason: "no-space", needed, free }, fresh)?.text;
    expect(stopped({ journeyId: "milano", reason: "no-space", needed: 207_880_000, free: 90_000_000 }, fresh))
      .toEqual({ role: "alert", text: "この端末の空きが足りないため、入れられません（約208 MB の空きが要ります。使える空きは約90 MB です）。" });
    expect(refused(69_500_000, 60_000_000)).toContain("約70 MB の空きが要ります。使える空きは約60 MB です");
    // The need is rounded up and the room down: the two never read the same.
    expect(refused(69_400_000, 69_300_000)).toContain("約70 MB の空きが要ります。使える空きは約69 MB です");
    expect(refused(20_000_001, 400_000)).toContain("約21 MB の空きが要ります。使える空きは約0.4 MB です");
  });

  it("says when a journey is complete or removed, and hides an old word while it runs again", () => {
    expect(row(milanoKept({ result: { journeyId: "milano", kind: "done" } }), "milano").notice).toEqual({ role: "status", text: "入れ終えました。" });
    expect(row(snapshot({ result: { journeyId: "milano", kind: "removed", bytes: 45_000_000 } }), "milano").notice).toEqual({ role: "status", text: "端末から消しました（約45 MB）。" });
    expect(row(snapshot({ result: { journeyId: "milano", kind: "removed", bytes: 45_000_000 } }), "golden_triangle").notice).toBeUndefined();
    // Everything went under a page of another build than the site's: the page is loaded anew.
    expect(row(snapshot({ result: { journeyId: "milano", kind: "removed", bytes: 45_000_000, reload: true } }), "milano").notice)
      .toEqual({ role: "status", reload: true, text: "端末から消しました（約45 MB）。ゲームが新しくなっているので、ページを読み込み直してください。" });
    const again = snapshot({ stop: { journeyId: "milano", reason: "offline" }, run: { kind: "first", journeyId: "milano", done: 0, total: 0 } });
    expect(row(again, "milano").notice).toBeUndefined();
  });
});

describe("the kept journeys' newer build", () => {
  const view = (change: Partial<OfflineSnapshot>) => offlineRows(milanoKept(change), catalog);

  it("has no block while everything is up to date, or nothing is kept", () => {
    expect(view({}).version).toBeNull();
    expect(offlineRows(snapshot({ newer: true, pending: 5 }), catalog).version).toBeNull();
  });

  it("offers a newer build's files with their size, once for all kept journeys", () => {
    expect(view({ newer: true, pending: 35_000_000 }).version).toEqual({
      kind: "update", heading: "新しい版", line: "新しい版の分（約35 MB）があります。入れ終えるまでは、今の版で遊べます。", actions: [{ id: "update", label: "新しい版の分を入れる" }],
    });
    // The kept journey's own row stays what it is: kept, removable.
    expect(view({ newer: true, pending: 35_000_000 }).rows[0]).toMatchObject({ kind: "held", actions: [{ id: "remove", label: "端末から消す" }] });
    expect(view({ newer: true, pending: 35_000_000, reachable: false }).version?.actions).toEqual([]);
  });

  it("shows the newer files loading, and makes the journeys wait", () => {
    const updating = view({ newer: true, pending: 7_000_000, run: { kind: "update", journeyId: null, done: 3_150_000, total: 7_000_000 } });
    expect(updating.version).toEqual({
      kind: "updating", heading: "新しい版", line: "新しい版の分を入れています。終わるまでは今の版で遊べます。", live: "45%（3.1 / 7.0 MB）", spoken: "25%",
      progress: { done: 3_150_000, total: 7_000_000 }, actions: [{ id: "stop", label: "止める" }],
    });
    expect(updating.rows.map((one) => [one.kind, one.line, one.actions.length])).toEqual([
      ["held", "この端末に入っています（約45 MB）。通信がなくても遊べます。", 0],
      ["waiting", "新しい版の分を入れ終えてから選べます。", 0],
    ]);
  });

  it("offers to load files that went missing again", () => {
    expect(view({ pending: 3_000_000 }).version).toEqual({
      kind: "missing", heading: "足りないファイル", line: "一部のファイルが端末からなくなっています（約3.0 MB）。", actions: [{ id: "update", label: "入れ直す" }],
    });
    expect(view({ pending: 3_000_000, reachable: false }).version).toMatchObject({ line: "一部のファイルが端末からなくなっています（約3.0 MB）。通信があるときに入れ直せます。", actions: [] });
    const repairing = view({ pending: 3_000_000, run: { kind: "repair", journeyId: null, done: 0, total: 3_000_000 } });
    expect(repairing.version).toMatchObject({ kind: "repairing", line: "足りないファイルを入れ直しています。", actions: [{ id: "stop", label: "止める" }] });
    expect(repairing.rows[1].line).toBe("足りないファイルを入れ直してから選べます。");
  });

  it("says when the newer build is in and opens at the next start", () => {
    expect(view({ switched: true }).version).toEqual({ kind: "switched", heading: "新しい版", line: "新しい版を入れ終えました。次にページを開いたときから、新しい版で遊べます。", actions: [] });
  });

  it("is hidden while a journey is being added (that run loads the newer files too)", () => {
    expect(view({ newer: true, pending: 35_000_000, run: { kind: "add", journeyId: "golden_triangle", done: 0, total: 1 } }).version).toBeNull();
  });

  it("puts its problems and results above the rows", () => {
    expect(view({ newer: true, pending: 35_000_000, stop: { journeyId: null, reason: "mismatch" } }).notice)
      .toEqual({ role: "alert", text: "ファイルを正しく読み込めませんでした。時間をおいて「新しい版の分を入れる」を押してください。" });
    expect(view({ pending: 3_000_000, stop: { journeyId: null, reason: "quota", needed: 2_000_000 } }).notice?.text).toContain("「入れ直す」を押してください");
    expect(view({ result: { journeyId: null, kind: "done", run: "update" } }).notice).toEqual({ role: "status", text: "新しい版の分を入れ終えました。" });
    expect(view({ result: { journeyId: null, kind: "done", run: "repair" } }).notice).toEqual({ role: "status", text: "足りないファイルを入れ直しました。" });
    // The block itself says it when the newer build opens at the next start.
    expect(view({ switched: true, result: { journeyId: null, kind: "done" } }).notice).toBeUndefined();
  });
});

describe("the dialog as a whole", () => {
  it("says what it is for, and what still needs a network", () => {
    const view = offlineRows(snapshot(), catalog);
    expect(view.blocked).toBeNull();
    expect(view.lead).toBe("選んだ旅行編の絵・音・声・音楽・ムービー・物語を、この端末に入れておきます。入れ終えると、通信がなくても、通信があるときと同じように遊べます。");
    expect(view.advice).toContain("Wi-Fiにつながっているときをおすすめします");
    expect(view.foot).toEqual(["通信がないときは、地図の背景（道や地形）は出ません。行き先は写真の札から選べます。英語の読み上げは、端末によっては通信が必要です。"]);
  });

  it("adds what the device holds, and what may be lost, once something is kept", () => {
    expect(offlineRows(milanoKept({ persisted: false, fonts: "none" }), catalog).foot).toEqual([
      "この端末に入れたファイル：約45 MB",
      "通信がないときは、地図の背景（道や地形）は出ません。行き先は写真の札から選べます。英語の読み上げは、端末によっては通信が必要です。",
      "ブラウザは、端末の空きが少なくなると、入れたファイルを消すことがあります。そのときは、もう一度入れてください。",
      "文字の形（フォント）は入れられませんでした。通信がないときは、端末にある文字で表示します。通信があるときにページを開くと、もう一度入れます。",
    ]);
    expect(offlineRows(milanoKept({ persisted: true, fonts: "kept" }), catalog).foot).toHaveLength(2);
    // The fonts are still being copied: no word of failure, and a word not to leave yet.
    expect(offlineRows(milanoKept({ fonts: "loading" }), catalog).foot.at(-1)).toBe("文字の形（フォント）を入れています。入れ終えるまで、ページを開いたまま通信を切らないでください。");
    expect(offlineRows(snapshot({ fonts: "loading" }), catalog).foot).toHaveLength(1);
  });

  it("shows one line instead of the rows where nothing can be kept", () => {
    // (And no word that the journey will be put on this device.)
    expect(offlineRows(snapshot({ support: "unsupported" }), catalog)).toMatchObject({ lead: "", blocked: { text: "このブラウザでは、端末に入れて遊ぶことはできません。", removeAll: false }, rows: [] });
    expect(offlineRows(snapshot({ support: "development" }), catalog).blocked?.text).toBe("開発用のサーバーでは使えません。公開版（本番ビルド）で使えます。");
    expect(offlineRows(snapshot({ store: "unknown" }), catalog)).toMatchObject({ blocked: { role: "status", text: "この端末に入っているものを確かめています。" }, rows: [] });
  });

  it("offers only the removal of everything for data this version cannot read", () => {
    const view = offlineRows(snapshot({ store: "unreadable", sizes: null }), catalog);
    expect(view).toMatchObject({ blocked: { role: "alert", text: "この端末に入っているオフライン用のデータを、この版では読み取れません。", removeAll: true }, rows: [], version: null });
    expect(offlineRows(snapshot({ result: { journeyId: null, kind: "removed" } }), catalog).notice).toEqual({ role: "status", text: "端末から消しました。" });
  });
});

describe("the confirmations", () => {
  it("says what keeping a first journey loads, with its size from the list", () => {
    expect(keepConfirm(snapshot(), catalog, "golden_triangle")).toEqual({
      title: "インド・ゴールデントライアングル編をこの端末に入れますか？",
      body: [
        "絵・音・声・音楽・ムービー・物語など、約171 MBをこの端末に入れます（ほかの旅行編と共通の分を含みます）。文字の形（フォント）も一緒に入れます。Wi-Fiにつながっているときをおすすめします。",
        "入れている間も遊べます。止めても、続きから入れられます。",
        "ゲームが新しくなったときは、通信があるときに変わった分だけを入れ直します（約30 MBまでは自動で、それより大きいときはここで選べます）。",
      ],
      fine: "保存データ（ゲームの進行）・英語ノート・設定は変わりません。", cancel: "やめる", action: "入れる", danger: false,
    });
  });

  it("counts a second journey as its own files, without the fonts already kept", () => {
    expect(keepConfirm(milanoKept(), catalog, "golden_triangle")?.body[0])
      .toBe("絵・音・声・音楽・ムービー・物語など、約133 MBをこの端末に入れます（ほかの旅行編と共通の分は入っています）。Wi-Fiにつながっているときをおすすめします。");
  });

  it("has nothing to confirm when the journey cannot be loaded now", () => {
    expect(keepConfirm(snapshot({ reachable: false }), catalog, "milano")).toBeNull();
    expect(keepConfirm(snapshot({ sizes: null }), catalog, "milano")).toBeNull();
  });

  it("says what removing a journey removes, what stays and how to get it back", () => {
    const both = bothKept();
    expect(removeConfirm(both, catalog, "golden_triangle")).toEqual({
      title: "インド・ゴールデントライアングル編をこの端末から消しますか？",
      body: [
        "この端末に入れたインド・ゴールデントライアングル編の絵・音・声・ムービー・物語（約133 MB）を消します。",
        "ほかの旅行編と共通のファイル（約38 MB）は、ミラノ編が使うので残ります。",
        "通信がない間は、この旅行編を遊べなくなります。通信があれば、これまでどおり遊べます。もう一度入れることもできます（また約133 MBを読み込みます）。",
      ],
      fine: "保存データ（ゲームの進行）・英語ノート・設定は消えません。", cancel: "消さずに戻る", action: "端末から消す", danger: true,
    });
    // The last one: the shared files go too.
    expect(removeConfirm(milanoKept(), catalog, "milano").body).toEqual([
      "この端末に入れたミラノ編の絵・音・声・ムービー・物語（約7.3 MB）を消します。",
      "ほかの旅行編と共通のファイル（約38 MB）も消します。",
      "通信がない間は、この旅行編を遊べなくなります。通信があれば、これまでどおり遊べます。もう一度入れることもできます（また約45 MBを読み込みます）。",
    ]);
  });

  it("sizes a removal by what the device holds, also while a newer build is on offer, and says to load the page anew when everything goes", () => {
    // The newer build's list names other files for 35 MB of what is kept: the removal still takes away all 45 MB.
    const newer = milanoKept({ newer: true, pending: 35_000_000, sizes: sizes({ shared: 30_000_000, milano: 5_000_000 }, 10_000_000) });
    expect(removeConfirm(newer, catalog, "milano").body).toEqual([
      "この端末に入れたミラノ編の絵・音・声・ムービー・物語（約7.3 MB）を消します。",
      "ほかの旅行編と共通のファイル（約38 MB）も消します。",
      "通信がない間は、この旅行編を遊べなくなります。ゲームが新しくなっているので、消したあとはページを読み込み直してください（通信があれば、新しい版でこれまでどおり遊べます）。もう一度入れることもできます（また約45 MBを読み込みます）。",
    ]);
    // The newer build is in and opens at the next start: this page is the older one, the same.
    expect(removeConfirm(milanoKept({ switched: true }), catalog, "milano").body[2]).toContain("消したあとはページを読み込み直してください");
    // Another journey stays (the page's own files with it), or the site could not be asked: as usual.
    expect(removeConfirm(bothKept({ newer: true, pending: 1 }), catalog, "milano").body[2]).toContain("通信があれば、これまでどおり遊べます。");
    expect(removeConfirm(milanoKept({ switched: true, reachable: false }), catalog, "milano").body[2]).toContain("通信があれば、これまでどおり遊べます。");
  });

  it("words the removal of a journey left midway by what is there", () => {
    const partial = snapshot({
      store: "kept", partial: ["golden_triangle"], sizes: sizes({ shared: 0, golden_triangle: 94_800_000 }),
      storedBy: { shared: 37_700_000, journeys: { golden_triangle: 38_300_000 } },
    });
    expect(removeConfirm(partial, catalog, "golden_triangle").body).toEqual([
      "途中まで入れたインド・ゴールデントライアングル編の絵・音・声・ムービー・物語（約38 MB）を消します。",
      "ほかの旅行編と共通のファイル（約38 MB）も消します。",
      "通信があれば、これまでどおり遊べます。もう一度入れるときは、最初から読み込みます。",
    ]);
  });

  it("asks once more before everything of an unreadable store goes", () => {
    expect(removeConfirm(snapshot({ store: "unreadable" }), catalog, "all")).toMatchObject({
      title: "端末に入れたオフライン用のファイルを、すべて消しますか？", fine: "保存データ（ゲームの進行）・英語ノート・設定は消えません。", cancel: "消さずに戻る", action: "端末から消す", danger: true,
    });
  });
});

describe("outside the dialog", () => {
  it("sums up what is kept in ゲームの設定's line", () => {
    expect(offlineSummary(snapshot(), catalog)).toEqual({ text: "旅行編をこの端末に入れておくと、通信がなくても遊べます。", entry: true });
    expect(offlineSummary(snapshot({ store: "unknown" }), catalog).text).toBe("旅行編をこの端末に入れておくと、通信がなくても遊べます。");
    expect(offlineSummary(milanoKept({ installed: ["golden_triangle", "milano"] }), catalog).text).toBe("この端末に入っています：ミラノ編、インド・ゴールデントライアングル編");
    expect(offlineSummary(snapshot({ run: { kind: "first", journeyId: "golden_triangle", done: 76_860_000, total: 170_800_000 } }), catalog))
      .toEqual({ text: "入れています：インド・ゴールデントライアングル編", live: "45%", entry: true });
    expect(offlineSummary(snapshot({ store: "kept", partial: ["golden_triangle"] }), catalog).text).toBe("途中まで入っています：インド・ゴールデントライアングル編");
    expect(offlineSummary(milanoKept({ partial: ["golden_triangle"] }), catalog).text).toBe("この端末に入っています：ミラノ編。途中まで入っています：インド・ゴールデントライアングル編");
    expect(offlineSummary(milanoKept({ newer: true, pending: 35_000_000 }), catalog).text).toBe("新しい版の分があります：ミラノ編（約35 MB）");
    expect(offlineSummary(milanoKept({ pending: 3_000_000 }), catalog).text).toBe("一部のファイルが端末からなくなっています：ミラノ編（約3.0 MB）");
    expect(offlineSummary(milanoKept({ run: { kind: "update", journeyId: null, done: 1, total: 4 } }), catalog)).toEqual({ text: "新しい版の分を入れています：ミラノ編", live: "25%", entry: true });
  });

  it("says in that line when a run stopped on a problem, which is more than a journey left midway", () => {
    const stopped = (stop: OfflineSnapshot["stop"], change: Partial<OfflineSnapshot> = {}) => offlineSummary(snapshot({ store: "kept", partial: ["milano"], ...change, stop }), catalog).text;
    const word = "入れるのが止まりました：ミラノ編（「オフラインで遊ぶ」で確かめてください）";
    for (const reason of ["offline", "mismatch", "storage", "quota", "reload", "no-space"] as const) expect(stopped({ journeyId: "milano", reason }), reason).toBe(word);
    // The player's own 止める, and a tab that gave way to another, are no problem to look into.
    for (const reason of ["stopped", "other-tab", "other-tab-run"] as const) expect(stopped({ journeyId: "milano", reason }), reason).toBe("途中まで入っています：ミラノ編");
    // Beside what is kept, and beside another journey left midway.
    expect(offlineSummary(milanoKept({ partial: ["golden_triangle"], stop: { journeyId: "golden_triangle", reason: "mismatch" } }), catalog).text)
      .toBe("この端末に入っています：ミラノ編。入れるのが止まりました：インド・ゴールデントライアングル編（「オフラインで遊ぶ」で確かめてください）");
    expect(offlineSummary(milanoKept({ newer: true, pending: 5_000_000, stop: { journeyId: null, reason: "mismatch" } }), catalog).text)
      .toBe("新しい版の分があります：ミラノ編（約5.0 MB）。入れるのが止まりました：新しい版の分（「オフラインで遊ぶ」で確かめてください）");
    expect(offlineSummary(milanoKept({ pending: 3_000_000, stop: { journeyId: null, reason: "offline" } }), catalog).text).toContain("入れるのが止まりました：足りないファイル");
  });

  it("gives the title the same words for screen readers and a short mark on its entry, only while there is something to say", () => {
    const quiet = [snapshot(), snapshot({ store: "unknown" }), snapshot({ support: "development" }), snapshot({ support: "unsupported" })];
    for (const state of quiet) expect([offlineTitleStatus(state, catalog), offlineEntryMark(state)]).toEqual([null, null]);
    const running = snapshot({ run: { kind: "first", journeyId: "milano", done: 20_250_000, total: 45_000_000 } });
    expect([offlineTitleStatus(running, catalog), offlineEntryMark(running)]).toEqual([{ text: "入れています：ミラノ編" }, "45%"]);
    expect(offlineEntryMark(snapshot({ run: { kind: "first", journeyId: "milano", done: 0, total: 0 } }))).toBe("入れています");
    expect([offlineTitleStatus(milanoKept(), catalog), offlineEntryMark(milanoKept())]).toEqual([{ text: "この端末に入っています：ミラノ編" }, "入っています"]);
    const partial = snapshot({ store: "kept", partial: ["milano"] });
    expect([offlineTitleStatus(partial, catalog), offlineEntryMark(partial)]).toEqual([{ text: "途中まで入っています：ミラノ編" }, "途中まで"]);
    const stopped = { ...partial, stop: { journeyId: "milano", reason: "offline" as const } };
    expect([offlineTitleStatus(stopped, catalog)?.text, offlineEntryMark(stopped)]).toEqual(["入れるのが止まりました：ミラノ編（「オフラインで遊ぶ」で確かめてください）", "止まりました"]);
    // A journey refused before anything was written (no room) is said too.
    const refused = snapshot({ stop: { journeyId: "milano", reason: "no-space", needed: 2, free: 1 } });
    expect([offlineTitleStatus(refused, catalog)?.text, offlineEntryMark(refused)]).toEqual(["入れるのが止まりました：ミラノ編（「オフラインで遊ぶ」で確かめてください）", "止まりました"]);
    expect(offlineEntryMark(milanoKept({ newer: true, pending: 1 }))).toBe("新しい版あり");
    expect(offlineEntryMark(milanoKept({ pending: 1 }))).toBe("足りない分あり");
    expect(offlineTitleStatus(snapshot({ store: "unreadable" }), catalog)).toEqual({ text: "この端末に入っているオフライン用のデータを、この版では読み取れません。" });
  });

  it("shows no way in where the browser cannot keep a journey", () => {
    expect(offlineSummary(snapshot({ support: "unsupported" }), catalog)).toEqual({ text: "このブラウザでは、端末に入れて遊ぶことはできません。", entry: false });
    expect(offlineSummary(snapshot({ store: "unreadable" }), catalog)).toEqual({ text: "この端末に入っているオフライン用のデータを、この版では読み取れません。", entry: true });
  });

  it("warns on the title only without a network, for a journey that is not among the kept ones", () => {
    const hint = "この旅行編は端末に入っていないため、通信がないと絵や音が出ません。";
    expect(offlineTitleHint(milanoKept(), false, "golden_triangle")).toBe(hint);
    expect(offlineTitleHint(milanoKept(), false, "milano")).toBeNull();
    expect(offlineTitleHint(milanoKept(), true, "golden_triangle")).toBeNull();
    // A device that keeps nothing is not told about it.
    expect(offlineTitleHint(snapshot(), false, "golden_triangle")).toBeNull();
  });

  it("words the short notes under the header with the journey's name", () => {
    expect(offlineToast({ type: "done", journeyId: "milano" }, catalog)).toBe("ミラノ編を、この端末に入れ終えました。");
    expect(offlineToast({ type: "stopped", journeyId: "golden_triangle", reason: "offline" }, catalog)).toBe("通信が切れたため、インド・ゴールデントライアングル編を入れるのを止めました。");
    expect(offlineToast({ type: "stopped", journeyId: "golden_triangle", reason: "quota" }, catalog)).toBe("空きが足りないため、インド・ゴールデントライアングル編を入れるのを止めました。");
    // Any other stop (a file that does not match, a write that failed, a page to load anew): the dialog says what to do.
    expect(offlineToast({ type: "stopped", journeyId: "milano", reason: "problem" }, catalog)).toBe("ミラノ編を入れるのが止まりました。「オフラインで遊ぶ」で確かめてください。");
  });

  it("adds a line to the save deletion only on a device that keeps something", () => {
    expect(offlineDeleteNote(snapshot())).toBeNull();
    expect(offlineDeleteNote(milanoKept())).toBe("この端末に入れた旅行編のファイル（オフラインで遊ぶ）は消えません。");
    expect(offlineDeleteNote(snapshot({ partial: ["milano"] }))).toBe("この端末に入れた旅行編のファイル（オフラインで遊ぶ）は消えません。");
  });

  it("never says ダウンロード or キャッシュ", () => {
    const states = [snapshot(), milanoKept({ newer: true, pending: 1, persisted: false }), snapshot({ store: "unreadable" }), snapshot({ support: "unsupported" }),
      snapshot({ stop: { journeyId: "milano", reason: "reload" } }), snapshot({ run: { kind: "first", journeyId: "milano", done: 1, total: 2, waiting: true } }),
      milanoKept({ fonts: "loading", stop: { journeyId: "golden_triangle", reason: "other-tab-run" }, result: { journeyId: "milano", kind: "removed", reload: true } })];
    const words = JSON.stringify([
      states.map((state) => [offlineRows(state, catalog), offlineSummary(state, catalog), offlineTitleStatus(state, catalog), offlineEntryMark(state)]),
      (["offline", "quota", "problem"] as const).map((reason) => offlineToast({ type: "stopped", journeyId: "milano", reason }, catalog)),
      keepConfirm(snapshot(), catalog, "milano"), removeConfirm(milanoKept(), catalog, "milano"), removeConfirm(snapshot(), catalog, "all"),
    ]);
    expect(words).not.toMatch(/ダウンロード|キャッシュ|Service Worker/u);
  });
});
