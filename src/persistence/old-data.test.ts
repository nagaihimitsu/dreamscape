// 「古い保存データの整理」 (docs/07 「古い保存データの整理」, AGENTS.md 「削除は対象キーと影響範囲を示し、
// 明示確認と別タブ競合の保護を維持する」): what may be removed is decided here, not on the screen.
// Only identified old versions, backups, Milan's keys from before journey slots and the keys of
// journeys this version does not have are listed; the saves this version loads, this journey's own
// slot, the notes and read lines of existing journeys, the display settings, the remembered journey
// and other sites' keys never are.
import { describe, expect, it } from "vitest";
import { journeys } from "../content/journeys";
import { createGame } from "../domain";
import { LEARNING_KEY, READ_LINES_KEY, SAVE_KEY } from "./index";
import type { LockManagerLike } from "./journey-lock";
import { journeyStorage } from "./journey-storage";
import {
  formatOldDataSize, listOldData, oldDataContext, oldDataLockNames, readDreamscapeEntries, readOldData, removeChosenOldData,
  removeOldData, type KeyedStorage, type OldDataContext,
} from "./old-data";

const context: OldDataContext = {
  journeys: [{ id: "milano", nameJa: "ミラノ編", status: "available" }, { id: "trip_b", nameJa: "見本B編", status: "available" },
    { id: "trip_c", nameJa: "見本C編", status: "preparing" }],
  currentJourneyId: "milano",
};
const key = (journeyId: string, logical: string) => journeyStorage(memory(), journeyId).physicalKey(logical);
const save = (journeyId: string) => key(journeyId, SAVE_KEY);
const backup = (journeyId: string, stamp: string) => key(journeyId, `${SAVE_KEY}.backup.${stamp}`);
const notes = (journeyId: string) => key(journeyId, LEARNING_KEY);
const readLines = (journeyId: string) => key(journeyId, READ_LINES_KEY);

/** A save this version loads (Milan), a v13-shaped save, a newer one, damaged bytes. */
const current = JSON.stringify(createGame("旅人", "小春"));
const v13 = JSON.stringify({ ...createGame(), schemaVersion: 13, completedChapters: [] });
const newer = JSON.stringify({ schemaVersion: 22, revision: 1 });
const damaged = "{damaged-save";
const notebook = JSON.stringify({ schemaVersion: 1, revision: 0, alwaysTranslate: false, revealed: {}, marks: {}, records: {}, openQuestion: null, openTopic: null });
const draft = JSON.stringify({ kind: "journey_preparation", schemaVersion: 1, journeyId: "trip_b" });
const readRecord = JSON.stringify({ schemaVersion: 1, ids: ["1a2b3c4d"] });

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const reads: string[] = [];
  const storage: KeyedStorage & { data: Map<string, string>; reads: string[]; setItem(key: string, value: string): void } = {
    data, reads,
    keys: () => [...data.keys()],
    getItem: (name) => { reads.push(name); return data.get(name) ?? null; },
    setItem: (name, value) => { data.set(name, value); },
    removeItem: (name) => { data.delete(name); },
  };
  return storage;
}
const list = (values: Record<string, string>, ctx = context) => listOldData(new Map(Object.entries(values)), ctx);

/** Keys the game uses today or must keep: nothing of this is ever listed. */
const kept = {
  [save("milano")]: current,
  [notes("milano")]: notebook,
  [notes("trip_b")]: notebook,
  // The lines read on this device (read-skip): kept for every journey of this version, the open one included.
  [readLines("milano")]: readRecord,
  [readLines("trip_c")]: readRecord,
  "dreamscape.presentation.v1": JSON.stringify({ schemaVersion: 1, confirmChoices: true, reduceMotion: false }),
  // The journey the title opens (src/app/last-journey.ts): a per-device preference like the settings.
  "dreamscape.last-journey.v1": "milano",
  // The Debug-mode switch (src/app/debug-mode.ts): another per-device preference.
  "dreamscape.debug-mode.v1": "on",
  "dreamscape.journey.trip_b.unknown": "not a slot key",
  "dreamscape.unknown.v1": "not a known key",
  // Shaped like slot keys, but not as the game writes them (backups are `.backup.<time>[.<n>]`).
  "dreamscape.journey.trip_b.save.v1.backup.abc": damaged,
  "dreamscape.journey.milano.save.v1.backup.": damaged,
  "dreamscape.journey.milano.save.v1.backup.1.x": damaged,
  "dreamscape.journey.trip_b.save.v1.extra": damaged,
  "dreamscape.journey.gone.save.v1.backup.abc": damaged,
  "dreamscape.journey.Trip_b.save.v1": v13,
  "dreamscape.save.v1.backup.abc": damaged,
  "other-site.save": "another app on the same origin",
};

describe("which old saved data can be removed", () => {
  it("lists nothing for the data in use, the settings, the remembered journey, the Debug-mode switch, the English notes, the read lines and other sites' keys", () => {
    expect(list(kept)).toEqual([]);
    // Another journey's save that is not an old version stays: damaged, newer, of another journey
    // (a Milan save in its slot), a preparation draft — its own title handles those.
    for (const value of [damaged, newer, current, draft]) expect(list({ ...kept, [save("trip_b")]: value })).toEqual([]);
  });

  it("lists another journey's save of an old version (v13 included), with its key, size and impact, never this journey's own slot", () => {
    const items = list({ ...kept, [save("trip_b")]: v13 });
    expect(items).toEqual([{
      id: "old_version:trip_b",
      lock: { name: "dreamscape:dreamscape.journey.trip_b.save.v1", ownerJa: "見本B編" },
      titleJa: "見本B編のセーブ（旧版）",
      impactJa: "バージョン13の形式のため、今の版では再開できません。消去すると、見本B編は次に開いたとき新しい旅から始まります。英語ノートは消えません。",
      keys: [{ key: "dreamscape.journey.trip_b.save.v1", noteJa: "バージョン13の旧版のセーブ", chars: "dreamscape.journey.trip_b.save.v1".length + v13.length, backedUpAt: null }],
    }]);
    for (const version of [1, 12]) expect(list({ [save("trip_b")]: JSON.stringify({ schemaVersion: version }) })[0].keys[0].noteJa)
      .toBe(`バージョン${version}の旧版のセーブ`);
    // A preparing journey opens its preparation page, not a new journey: the impact says so.
    expect(list({ [save("trip_c")]: v13 })).toMatchObject([{ id: "old_version:trip_c", titleJa: "見本C編のセーブ（旧版）",
      impactJa: "バージョン13の形式のため、今の版では再開できません。見本C編は準備中で、今は遊べません。消去すると、遊べるようになったとき新しい旅から始まります。英語ノートは消えません。" }]);
    // The journey open in this tab: its slot is the title's and 「保存データの消去」's, not the cleanup's.
    expect(list({ ...kept, [save("milano")]: v13 })).toEqual([]);
    expect(list({ [save("trip_b")]: v13 }, { ...context, currentJourneyId: "trip_b" })).toEqual([]);
  });

  it("lists the backups of every journey with what each holds, but never a backup that loads as a current save", () => {
    const items = list({
      ...kept,
      [backup("milano", "1762500000000")]: damaged,
      [backup("milano", "1762500000000.1")]: v13,
      [backup("milano", "1762600000000")]: current,
      [backup("trip_b", "1762700000000")]: newer,
    });
    expect(items.map(({ id, titleJa, lock }) => ({ id, titleJa, lock }))).toEqual([
      // This tab holds Milan's lock already; trip_b's is taken while removing.
      { id: "backup:milano", titleJa: "ミラノ編のバックアップ（2件）", lock: null },
      { id: "backup:trip_b", titleJa: "見本B編のバックアップ（1件）", lock: { name: "dreamscape:dreamscape.journey.trip_b.save.v1", ownerJa: "見本B編" } },
    ]);
    expect(items[0].keys.map(({ key, noteJa, backedUpAt }) => ({ key, noteJa, backedUpAt }))).toEqual([
      { key: "dreamscape.journey.milano.save.v1.backup.1762500000000", noteJa: "退避したデータ（読み込めないデータ）", backedUpAt: 1762500000000 },
      { key: "dreamscape.journey.milano.save.v1.backup.1762500000000.1", noteJa: "退避したデータ（バージョン13の旧版のセーブ）", backedUpAt: 1762500000000 },
    ]);
    expect(items[1].keys[0].noteJa).toBe("退避したデータ（新しい版（バージョン22）のセーブ）");
    expect(items[0].impactJa).toBe("読み込めなかったセーブを、新しく始める前に退避したものです。ゲームはバックアップを読み込みません。消去すると元のデータは取り出せなくなります。今のセーブと英語ノートは消えません。");
    // Only backups that load in this version: nothing to list.
    expect(list({ ...kept, [backup("milano", "1")]: current })).toEqual([]);
  });

  it("lists Milan's keys from before journey slots: the save with its backups, and the English notes apart", () => {
    const items = list({
      ...kept,
      [SAVE_KEY]: v13,
      [`${SAVE_KEY}.backup.1700000000000`]: damaged,
      [`${SAVE_KEY}.backup.1700000000001`]: current,
      [LEARNING_KEY]: notebook,
    });
    expect(items).toEqual([
      {
        id: "old_milano:save", lock: null,
        titleJa: "以前のミラノ編のセーブ",
        impactJa: "旅行編ごとに保存先を分ける前の、ミラノ編のセーブです。今のゲームは読み込みません。今のミラノ編のセーブと英語ノートは消えません。",
        keys: [
          { key: "dreamscape.save.v1", noteJa: "バージョン13の旧版のセーブ", chars: "dreamscape.save.v1".length + v13.length, backedUpAt: null },
          { key: "dreamscape.save.v1.backup.1700000000000", noteJa: "退避したデータ（読み込めないデータ）", chars: "dreamscape.save.v1.backup.1700000000000".length + damaged.length, backedUpAt: 1700000000000 },
        ],
      },
      {
        id: "old_milano:learning", lock: null,
        titleJa: "以前のミラノ編の英語ノート",
        impactJa: "旅行編ごとに保存先を分ける前の英語ノートです。今のゲームは読み込みません。消去すると、その記録と復習の印は戻せません。今のミラノ編の英語ノートは消えません。",
        keys: [{ key: "dreamscape.learning.v1", noteJa: "英語ノート", chars: "dreamscape.learning.v1".length + notebook.length, backedUpAt: null }],
      },
    ]);
  });

  it("lists every key of a journey this version does not have, its notes apart, under that journey's lock", () => {
    // A save of the journey in a version that has it (this version cannot tell it from damaged bytes).
    const removed = { [save("zeta")]: current.replace('"milano"', '"zeta_city"'), [backup("zeta", "5")]: v13, [backup("zeta", "6")]: damaged, [notes("zeta")]: notebook, [notes("alpha")]: notebook,
      [readLines("zeta")]: readRecord };
    const items = list({ ...kept, ...removed });
    const zetaLock = { name: "dreamscape:dreamscape.journey.zeta.save.v1", ownerJa: "旅行編「zeta」" };
    expect(items.map(({ id, titleJa, lock }) => ({ id, titleJa, lock }))).toEqual([
      { id: "removed:alpha:learning", titleJa: "この版にない旅行編「alpha」の英語ノート", lock: { name: "dreamscape:dreamscape.journey.alpha.save.v1", ownerJa: "旅行編「alpha」" } },
      { id: "removed:zeta:save", titleJa: "この版にない旅行編「zeta」のセーブ", lock: zetaLock },
      { id: "removed:zeta:learning", titleJa: "この版にない旅行編「zeta」の英語ノート", lock: zetaLock },
      { id: "removed:zeta:read_lines", titleJa: "この版にない旅行編「zeta」の既読の記録", lock: zetaLock },
    ]);
    expect(items[1].keys.map((entry) => [entry.key, entry.noteJa])).toEqual([
      ["dreamscape.journey.zeta.save.v1", "この版では読み込めないセーブ"],
      ["dreamscape.journey.zeta.save.v1.backup.5", "退避したデータ（バージョン13の旧版のセーブ）"],
      ["dreamscape.journey.zeta.save.v1.backup.6", "退避したデータ（この版では読み込めないセーブ）"],
    ]);
    expect(items[1].impactJa).toBe("この版のゲームにない旅行編のため、読み込みません。その旅行編がある版で開くと使われることがあります。消去すると戻せません。");
    expect(items[2].impactJa).toBe("この版のゲームにない旅行編の英語ノートです。今のゲームは読み込みません。消去すると、その記録と復習の印は戻せません。");
    expect(items[3].keys).toEqual([{ key: "dreamscape.journey.zeta.read-lines.v1", noteJa: "既読の記録",
      chars: "dreamscape.journey.zeta.read-lines.v1".length + readRecord.length, backedUpAt: null }]);
    // A save that loads in this version is kept even under an unknown journey's key.
    expect(list({ [save("zeta")]: current })).toEqual([]);
  });

  it("orders the journeys of this version first (catalog order), then Milan's old keys, then removed journeys", () => {
    const items = list({ [backup("trip_b", "1")]: damaged, [LEARNING_KEY]: notebook, [backup("milano", "1")]: damaged, [save("trip_b")]: v13, [notes("gone")]: notebook });
    expect(items.map((item) => item.id)).toEqual(["backup:milano", "old_version:trip_b", "backup:trip_b", "old_milano:learning", "removed:gone:learning"]);
  });

  it("reads only the site's dreamscape keys", () => {
    const storage = memory({ ...kept, [save("trip_b")]: v13 });
    const entries = readDreamscapeEntries(storage);
    expect([...entries.keys()]).not.toContain("other-site.save");
    expect(storage.reads).not.toContain("other-site.save");
    expect(readOldData(storage, context).items.map((item) => item.id)).toEqual(["old_version:trip_b"]);
  });

  it("lists with every journey of this version, so a preparing journey's draft and notes are never 「この版にない」 keys", () => {
    const context = oldDataContext("milano");
    expect(context).toEqual({ journeys, currentJourneyId: "milano" });
    const preparing = journeys.filter((journey) => journey.status === "preparing");
    expect(preparing.map((journey) => journey.id).sort()).toEqual(["luang_prabang", "uzbekistan"]);
    const values = Object.fromEntries(preparing.flatMap((journey) => [
      [save(journey.id), JSON.stringify({ kind: "journey_preparation", schemaVersion: 1, journeyId: journey.id })],
      [notes(journey.id), notebook],
    ]));
    expect(list(values, context)).toEqual([]);
  });

  it("names each lock once and none for keys no tab of this version locks", () => {
    const items = list({ [backup("milano", "1")]: damaged, [save("trip_b")]: v13, [backup("trip_b", "1")]: damaged, [LEARNING_KEY]: notebook, [notes("gone")]: notebook });
    expect(oldDataLockNames(items)).toEqual(["dreamscape:dreamscape.journey.gone.save.v1", "dreamscape:dreamscape.journey.trip_b.save.v1"]);
    expect(oldDataLockNames(items.filter((item) => item.lock === null))).toEqual([]);
  });

  it("shows sizes as UTF-16 kilobytes, rounded up to 0.1 KB", () => {
    expect(formatOldDataSize(0)).toBe("約0.1 KB");
    expect(formatOldDataSize(512)).toBe("約1.0 KB");
    expect(formatOldDataSize(513)).toBe("約1.1 KB");
  });
});

describe("removing old saved data", () => {
  const old = {
    [save("trip_b")]: v13,
    [backup("milano", "1")]: damaged,
    [backup("milano", "2")]: v13,
    [SAVE_KEY]: v13,
    [LEARNING_KEY]: notebook,
    [notes("gone")]: notebook,
  };

  it("removes exactly the chosen items' keys and leaves every other key as it was", () => {
    const storage = memory({ ...kept, ...old });
    const listing = readOldData(storage, context);
    const result = removeOldData(storage, listing, ["backup:milano", "old_milano:learning"]);
    expect(result).toEqual({ ok: true, removedKeys: [backup("milano", "1"), backup("milano", "2"), LEARNING_KEY] });
    expect(Object.fromEntries(storage.data)).toEqual({ ...kept, [save("trip_b")]: v13, [SAVE_KEY]: v13, [notes("gone")]: notebook });
    // Everything else listed can go too; what the game uses stays.
    expect(removeOldData(storage, readOldData(storage, context), ["old_version:trip_b", "old_milano:save", "removed:gone:learning"]).ok).toBe(true);
    expect(Object.fromEntries(storage.data)).toEqual(kept);
    expect(readOldData(storage, context).items).toEqual([]);
  });

  it("removes nothing when a chosen key changed, disappeared or stopped being removable after the list was read", () => {
    const changes: [string, (storage: ReturnType<typeof memory>) => void][] = [
      ["another tab writes a backup", (storage) => storage.setItem(backup("milano", "1"), "{other bytes")],
      ["a backup disappears", (storage) => storage.removeItem(backup("milano", "2"))],
      ["the old save is replaced by a save of this version", (storage) => storage.setItem(save("trip_b"), current)],
    ];
    for (const [label, change] of changes) {
      const storage = memory({ ...kept, ...old });
      const listing = readOldData(storage, context);
      change(storage);
      const before = Object.fromEntries(storage.data);
      const result = removeOldData(storage, listing, ["backup:milano", "old_version:trip_b"]);
      expect(result, label).toEqual({ ok: false, removedKeys: [],
        message: "一覧を開いた後に保存データが変わったため、何も消去しませんでした。一覧を読み直しました。選んだ内容を確かめてからやり直してください。" });
      expect(Object.fromEntries(storage.data), label).toEqual(before);
    }
  });

  it("removes nothing when storage cannot be read, and stops at a key that cannot be removed", () => {
    const unreadable = memory({ ...kept, ...old });
    const listing = readOldData(unreadable, context);
    unreadable.keys = () => { throw new DOMException("The operation is insecure.", "SecurityError"); };
    expect(removeOldData(unreadable, listing, ["backup:milano"])).toEqual({ ok: false, removedKeys: [],
      message: "保存データを読み取れなかったため、何も消去しませんでした。ブラウザの保存設定を確認してください。" });
    expect(unreadable.data.get(backup("milano", "1"))).toBe(damaged);

    const failing = memory({ ...kept, ...old });
    const remove = failing.removeItem;
    failing.removeItem = (name) => { if (name === backup("milano", "2")) throw new Error("cannot remove"); remove(name); };
    expect(removeOldData(failing, readOldData(failing, context), ["backup:milano", "old_milano:learning"])).toEqual({
      ok: false, removedKeys: [backup("milano", "1")],
      message: "dreamscape.journey.milano.save.v1.backup.2 を消去できませんでした。その前の1個のキーは消去しました。一覧を読み直したので、残っているものを確かめてください。",
    });
    expect(failing.data.has(backup("milano", "1"))).toBe(false);
    expect(failing.data.get(backup("milano", "2"))).toBe(v13);
    expect(failing.data.get(LEARNING_KEY)).toBe(notebook);
  });

  it("holds only the chosen items' locks: a journey open in another tab refuses only what touches its keys", async () => {
    const tripB = "dreamscape:dreamscape.journey.trip_b.save.v1";
    const asked: string[] = [];
    // Another tab has 見本B編 open: its slot lock is taken; every other lock is free.
    const locks: LockManagerLike = { request: async (name, _options, callback) => {
      asked.push(name);
      return callback(name === tripB ? null : { name, mode: "exclusive" } as Lock);
    } };
    const storage = memory({ ...old });
    const listing = readOldData(storage, context);
    expect(await removeChosenOldData(storage, locks, listing, ["backup:milano", "old_version:trip_b"])).toEqual({ status: "busy", name: tripB });
    expect(Object.fromEntries(storage.data)).toEqual(old);
    // Milan's old keys and this journey's backups need no lock: they go while 見本B編 stays open.
    asked.length = 0;
    expect(await removeChosenOldData(storage, locks, listing, ["old_milano:save", "backup:milano"]))
      .toEqual({ status: "done", value: { ok: true, removedKeys: [backup("milano", "1"), backup("milano", "2"), SAVE_KEY] } });
    expect(asked).toEqual([]);
    expect(storage.data.has(save("trip_b"))).toBe(true);
    expect(await removeChosenOldData(storage, undefined, readOldData(storage, context), ["old_version:trip_b"])).toEqual({ status: "unsupported" });
    expect(storage.data.has(save("trip_b"))).toBe(true);
  });

  it("refuses an empty choice and ignores an item the list does not have", () => {
    const storage = memory({ ...kept, ...old });
    const empty = { ok: false, removedKeys: [], message: "消去するデータを選んでください。" };
    expect(removeOldData(storage, readOldData(storage, context), [])).toEqual(empty);
    // The open journey's own slot is never listed, so asking for it by name removes nothing.
    const listing = readOldData(storage, { ...context, currentJourneyId: "trip_b" });
    expect(listing.items.map((item) => item.id)).not.toContain("old_version:trip_b");
    expect(removeOldData(storage, listing, ["old_version:trip_b"])).toEqual(empty);
    expect(Object.fromEntries(storage.data)).toEqual({ ...kept, ...old });
  });
});
