import { LEARNING_KEY, SAVE_KEY, isSaveBackupKey, loadGame } from "./index";
import { journeyPhysicalKey, parseJourneyPhysicalKey } from "./journey-storage";
import { slotLockName } from "./journey-lock";

/**
 * 「古い保存データの整理」 (Settings): which of this browser's Dreamscape keys the game no longer uses
 * and the player may remove, with what each one is and what removing it changes (AGENTS.md 「削除は
 * 対象キーと影響範囲を示し、明示確認と別タブ競合の保護を維持する」, docs/07 「古い保存データの整理」).
 *
 * Listed (each item = keys removed together):
 * - another journey's game save identified as an old version (loadGame `legacy`: v1 to v13);
 * - backups of unreadable saves (`….save.v1.backup.<time>[.<n>]`, as backupAndCreate names them),
 *   of every journey including this one;
 * - the keys Milan used before journeys had their own slots (`dreamscape.save.v1` with its backups,
 *   `dreamscape.learning.v1`);
 * - the keys of a journey this version does not have (its save with backups, and its notes apart).
 * Never listed: this journey's own save slot (its title and 「保存データの消去」 handle it), any game
 * save that loads in this version (also as a backup), another journey's save that is not an old
 * version (damaged, newer, preparation draft), the English notes of a journey this version has,
 * the display settings, every key outside the patterns above (other sites on the same origin
 * included). Debug keeps its data in memory only, so nothing of it is in browser storage.
 */

/** A journey of this version, as the list names it. */
/** A journey of this version; a preparing one opens its preparation page, not a game. */
export type KnownJourney = { id: string; nameJa: string; status: "available" | "preparing" };
export type OldDataContext = {
  journeys: readonly KnownJourney[];
  /** The journey open in this tab: its save slot is never listed and this tab already holds its lock. */
  currentJourneyId: string;
};

export type OldDataKey = {
  key: string;
  /** What the key holds (Japanese, shown beside the key name). */
  noteJa: string;
  /** Characters of key and value: browser storage keeps them as UTF-16 (about 2 bytes each). */
  chars: number;
  /** When a backup was made (from its key), else null. */
  backedUpAt: number | null;
};
export type OldDataItem = {
  /** What the item is and stable while the same keys are listed: `old_version:<id>`, `backup:<id>`, `old_milano:save|learning`, `removed:<id>:save|learning`. */
  id: string;
  titleJa: string;
  impactJa: string;
  keys: OldDataKey[];
  /**
   * The slot lock held while the keys are removed, so a tab that has the journey open (and may write
   * them) refuses the removal, and who would hold it (for that refusal); null when no tab of this
   * version can hold one (this tab already holds the current journey's lock; no version that used
   * the old Milan keys took a lock).
   */
  lock: { name: string; ownerJa: string } | null;
};

/** The browser storage the cleanup reads: every key of the origin and its value. */
export interface KeyedStorage {
  keys(): string[];
  getItem(key: string): string | null;
  removeItem(key: string): void;
}

export type OldDataListing = {
  context: OldDataContext;
  items: OldDataItem[];
  /** Every Dreamscape key's value when the list was read: removal checks that nothing changed since. */
  values: ReadonlyMap<string, string>;
};

const PREFIX = "dreamscape.";

/** Only `dreamscape.` keys are read; any other key of the origin is never looked at. */
export function readDreamscapeEntries(storage: KeyedStorage): Map<string, string> {
  const entries = new Map<string, string>();
  for (const key of storage.keys().filter((name) => name.startsWith(PREFIX)).sort()) {
    const value = storage.getItem(key);
    if (value !== null) entries.set(key, value);
  }
  return entries;
}

type SaveContent = { kind: "current" } | { kind: "old" | "newer"; version: number } | { kind: "unreadable" };

/** Read a game save as the game would (`journeyId` = the slot it is in; omitted = any journey). */
function describeSave(raw: string, journeyId?: string): SaveContent {
  const result = loadGame({ getItem: (key) => key === SAVE_KEY ? raw : null, setItem: () => { throw new Error("read only"); }, journeyId });
  if (result.status === "loaded") return { kind: "current" };
  if (result.status === "invalid" && (result.kind === "legacy" || result.kind === "newer")) {
    const version = (JSON.parse(raw) as { schemaVersion: number }).schemaVersion;
    return { kind: result.kind === "legacy" ? "old" : "newer", version };
  }
  return { kind: "unreadable" };
}

const UNREADABLE_JA = "読み込めないデータ";
/** A journey this version does not have: its save may be fine in a version that has the journey. */
const ABSENT_JOURNEY_SAVE_JA = "この版では読み込めないセーブ";

function contentNote(content: SaveContent, unreadableJa = UNREADABLE_JA): string {
  switch (content.kind) {
    case "old": return `バージョン${content.version}の旧版のセーブ`;
    case "newer": return `新しい版（バージョン${content.version}）のセーブ`;
    default: return unreadableJa;
  }
}

function backupTime(key: string): number | null {
  const stamp = /\.backup\.(\d{1,15})(?:\.\d+)?$/.exec(key)?.[1];
  return stamp === undefined ? null : Number(stamp);
}

const entry = (key: string, value: string, noteJa: string): OldDataKey =>
  ({ key, noteJa, chars: key.length + value.length, backedUpAt: backupTime(key) });

/** Game saves (slot or backup) that are not a save this version loads, with what each holds. */
function unusedSaves(entries: ReadonlyMap<string, string>, keys: readonly string[], unreadableJa = UNREADABLE_JA): OldDataKey[] {
  const listed: OldDataKey[] = [];
  for (const key of keys) {
    const value = entries.get(key)!;
    const content = describeSave(value);
    if (content.kind === "current") continue;
    const note = contentNote(content, unreadableJa);
    listed.push(entry(key, value, key.includes(".backup.") ? `退避したデータ（${note}）` : note));
  }
  return listed;
}

/** What the player may remove now, in this order: the journeys of this version, Milan's old keys, removed journeys. */
export function listOldData(entries: ReadonlyMap<string, string>, context: OldDataContext): OldDataItem[] {
  const known = new Map(context.journeys.map((journey) => [journey.id, journey]));
  const byJourney = new Map<string, { save?: string; backups: string[]; learning?: string }>();
  for (const key of entries.keys()) {
    const parsed = parseJourneyPhysicalKey(key);
    if (!parsed) continue;
    const slot = byJourney.get(parsed.journeyId) ?? { backups: [] };
    if (parsed.key === SAVE_KEY) slot.save = key;
    else if (parsed.key === LEARNING_KEY) slot.learning = key;
    else if (isSaveBackupKey(parsed.key)) slot.backups.push(key);
    else continue;
    byJourney.set(parsed.journeyId, slot);
  }
  const items: OldDataItem[] = [];

  for (const journey of context.journeys) {
    const slot = byJourney.get(journey.id);
    if (!slot) continue;
    const current = journey.id === context.currentJourneyId;
    const lock = current ? null : { name: slotLockName(journeyPhysicalKey(journey.id, SAVE_KEY)), ownerJa: journey.nameJa };
    if (!current && slot.save !== undefined) {
      const raw = entries.get(slot.save)!;
      const content = describeSave(raw, journey.id);
      if (content.kind === "old") items.push({
        id: `old_version:${journey.id}`, lock,
        titleJa: `${journey.nameJa}のセーブ（旧版）`,
        impactJa: `バージョン${content.version}の形式のため、今の版では再開できません。` + (journey.status === "available"
          ? `消去すると、${journey.nameJa}は次に開いたとき新しい旅から始まります。`
          : `${journey.nameJa}は準備中で、今は遊べません。消去すると、遊べるようになったとき新しい旅から始まります。`) + "英語ノートは消えません。",
        keys: [entry(slot.save, raw, contentNote(content))],
      });
    }
    const backups = unusedSaves(entries, slot.backups);
    if (backups.length) items.push({
      id: `backup:${journey.id}`, lock,
      titleJa: `${journey.nameJa}のバックアップ（${backups.length}件）`,
      impactJa: "読み込めなかったセーブを、新しく始める前に退避したものです。ゲームはバックアップを読み込みません。消去すると元のデータは取り出せなくなります。今のセーブと英語ノートは消えません。",
      keys: backups,
    });
  }

  // Milan before journeys had their own slots (no version that wrote these keys took a lock).
  const rootSaves = unusedSaves(entries, [...entries.keys()].filter((key) => key === SAVE_KEY || isSaveBackupKey(key)));
  if (rootSaves.length) items.push({
    id: "old_milano:save", lock: null,
    titleJa: "以前のミラノ編のセーブ",
    impactJa: "旅行編ごとに保存先を分ける前の、ミラノ編のセーブです。今のゲームは読み込みません。今のミラノ編のセーブと英語ノートは消えません。",
    keys: rootSaves,
  });
  const rootNotes = entries.get(LEARNING_KEY);
  if (rootNotes !== undefined) items.push({
    id: "old_milano:learning", lock: null,
    titleJa: "以前のミラノ編の英語ノート",
    impactJa: "旅行編ごとに保存先を分ける前の英語ノートです。今のゲームは読み込みません。消去すると、その記録と復習の印は戻せません。今のミラノ編の英語ノートは消えません。",
    keys: [entry(LEARNING_KEY, rootNotes, "英語ノート")],
  });

  for (const [journeyId, slot] of [...byJourney].filter(([id]) => !known.has(id)).sort(([a], [b]) => a.localeCompare(b))) {
    const name = `旅行編「${journeyId}」`;
    const lock = { name: slotLockName(journeyPhysicalKey(journeyId, SAVE_KEY)), ownerJa: name };
    const saves = unusedSaves(entries, [...(slot.save === undefined ? [] : [slot.save]), ...slot.backups], ABSENT_JOURNEY_SAVE_JA);
    if (saves.length) items.push({
      id: `removed:${journeyId}:save`, lock,
      titleJa: `この版にない${name}のセーブ`,
      impactJa: "この版のゲームにない旅行編のため、読み込みません。その旅行編がある版で開くと使われることがあります。消去すると戻せません。",
      keys: saves,
    });
    if (slot.learning !== undefined) items.push({
      id: `removed:${journeyId}:learning`, lock,
      titleJa: `この版にない${name}の英語ノート`,
      impactJa: "この版のゲームにない旅行編の英語ノートです。今のゲームは読み込みません。消去すると、その記録と復習の印は戻せません。",
      keys: [entry(slot.learning, entries.get(slot.learning)!, "英語ノート")],
    });
  }
  return items;
}

/** Read the list from browser storage; throws when the storage cannot be read. */
export function readOldData(storage: KeyedStorage, context: OldDataContext): OldDataListing {
  const values = readDreamscapeEntries(storage);
  return { context, items: listOldData(values, context), values };
}

/** The slot locks to hold while removing `items` (each once). */
export function oldDataLockNames(items: readonly OldDataItem[]): string[] {
  return [...new Set(items.flatMap((item) => item.lock === null ? [] : [item.lock.name]))].sort();
}

export type OldDataRemoval =
  | { ok: true; removedKeys: string[] }
  | { ok: false; message: string; removedKeys: string[] };

/**
 * Remove the chosen items' keys. All of them are checked first: if any key no longer holds the value
 * listed or is no longer listed as removable (another tab or screen may have written it since),
 * nothing is removed. Then the keys are removed in order; one that cannot be removed stops the rest,
 * and the result names it and the keys removed before it. Call it while holding `oldDataLockNames`
 * of the chosen items.
 */
export function removeOldData(storage: KeyedStorage, listing: OldDataListing, chosenIds: readonly string[]): OldDataRemoval {
  const chosen = listing.items.filter((item) => chosenIds.includes(item.id));
  if (!chosen.length) return { ok: false, message: "消去するデータを選んでください。", removedKeys: [] };
  const keys = chosen.flatMap((item) => item.keys.map((key) => key.key));
  try {
    const now = readDreamscapeEntries(storage);
    const removable = new Set(listOldData(now, listing.context).flatMap((item) => item.keys.map((key) => key.key)));
    if (keys.some((key) => now.get(key) !== listing.values.get(key) || !removable.has(key)))
      return { ok: false, removedKeys: [],
        message: "一覧を開いた後に保存データが変わったため、何も消去しませんでした。一覧を読み直したので、もう一度選んでください。" };
  } catch {
    return { ok: false, removedKeys: [], message: "保存データを読み取れなかったため、何も消去しませんでした。ブラウザの保存設定を確認してください。" };
  }
  const removedKeys: string[] = [];
  for (const key of keys) {
    try {
      storage.removeItem(key);
    } catch {
      return { ok: false, removedKeys,
        message: `${key} を消去できませんでした。${removedKeys.length ? `その前の${removedKeys.length}個のキーは消去しました。` : "何も消去していません。"}一覧を読み直したので、残っているものを確かめてください。` };
    }
    removedKeys.push(key);
  }
  return { ok: true, removedKeys };
}

/** Approximate size as the list shows it (UTF-16, rounded up to 0.1 KB). */
export function formatOldDataSize(chars: number): string {
  const tenths = Math.max(1, Math.ceil((chars * 2) / 102.4));
  return `約${(tenths / 10).toFixed(1)} KB`;
}
