import { LEARNING_KEY, SAVE_KEY, loadGame } from "./index";
import { journeyPhysicalKey } from "./journey-storage";
import { slotLockName } from "./journey-lock";

/**
 * 「古い保存データの整理」 (Settings): which of this browser's Dreamscape keys the game no longer uses
 * and the player may remove, with what each one is and what removing it changes (AGENTS.md 「削除は
 * 対象キーと影響範囲を示し、明示確認と別タブ競合の保護を維持する」, docs/07 「古い保存データの整理」).
 *
 * Listed (each item = keys removed together):
 * - another journey's game save identified as an old version (loadGame `legacy`: v1 to v13);
 * - backups of unreadable saves (`….save.v1.backup.<time>`), of every journey including this one;
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
export type KnownJourney = { id: string; nameJa: string };
export type OldDataContext = {
  journeys: readonly KnownJourney[];
  /** The journey open in this tab: its save slot is never listed and this tab already holds its lock. */
  currentJourneyId: string;
};

export type OldDataKind = "old_version" | "backup" | "old_milano" | "removed_journey";
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
  /** Stable while the same keys are listed, e.g. `backup:milano`. */
  id: string;
  kind: OldDataKind;
  titleJa: string;
  impactJa: string;
  keys: OldDataKey[];
  /**
   * The slot lock held while the keys are removed, so a tab that has the journey open (and may write
   * them) refuses the removal; null when no tab of this version can hold one (this tab already holds
   * the current journey's lock; no version that used the old Milan keys took a lock).
   */
  lockName: string | null;
  /** Who would hold that lock, for the refusal message. */
  ownerJa: string;
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
const ROOT_BACKUP = `${SAVE_KEY}.backup.`;
// The physical keys of journeyStorage (journey-storage.ts): `dreamscape.journey.<id>.save.v1`,
// its backups `….save.v1.backup.<time>[.<n>]` and `dreamscape.journey.<id>.learning.v1`.
const JOURNEY_KEY = /^dreamscape\.journey\.([a-z][a-z0-9_]*)\.(save\.v1(?:\.backup\..+)?|learning\.v1)$/;

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

function contentNote(content: SaveContent): string {
  switch (content.kind) {
    case "old": return `バージョン${content.version}の旧版のセーブ`;
    case "newer": return `新しい版（バージョン${content.version}）のセーブ`;
    default: return "読み込めないデータ";
  }
}

function backupTime(key: string): number | null {
  const stamp = /\.backup\.(\d{1,15})(?:\.\d+)?$/.exec(key)?.[1];
  return stamp === undefined ? null : Number(stamp);
}

const entry = (key: string, value: string, noteJa: string): OldDataKey =>
  ({ key, noteJa, chars: key.length + value.length, backedUpAt: backupTime(key) });

/** Game saves (slot or backup) that are not a save this version loads, with what each holds. */
function unusedSaves(entries: ReadonlyMap<string, string>, keys: readonly string[], backupNote: boolean): OldDataKey[] {
  const listed: OldDataKey[] = [];
  for (const key of keys) {
    const value = entries.get(key)!;
    const content = describeSave(value);
    if (content.kind === "current") continue;
    const note = contentNote(content);
    listed.push(entry(key, value, backupNote && key.includes(".backup.") ? `退避したデータ（${note}）` : note));
  }
  return listed;
}

/** What the player may remove now, in this order: the journeys of this version, Milan's old keys, removed journeys. */
export function listOldData(entries: ReadonlyMap<string, string>, context: OldDataContext): OldDataItem[] {
  const known = new Map(context.journeys.map((journey) => [journey.id, journey]));
  const byJourney = new Map<string, { save?: string; backups: string[]; learning?: string }>();
  for (const key of entries.keys()) {
    const match = JOURNEY_KEY.exec(key);
    if (!match) continue;
    const slot = byJourney.get(match[1]) ?? { backups: [] };
    if (match[2] === "save.v1") slot.save = key;
    else if (match[2] === "learning.v1") slot.learning = key;
    else slot.backups.push(key);
    byJourney.set(match[1], slot);
  }
  const items: OldDataItem[] = [];

  for (const journey of context.journeys) {
    const slot = byJourney.get(journey.id);
    if (!slot) continue;
    const current = journey.id === context.currentJourneyId;
    const lockName = current ? null : slotLockName(journeyPhysicalKey(journey.id, SAVE_KEY));
    if (!current && slot.save !== undefined) {
      const raw = entries.get(slot.save)!;
      const content = describeSave(raw, journey.id);
      if (content.kind === "old") items.push({
        id: `old_version:${journey.id}`, kind: "old_version", lockName, ownerJa: journey.nameJa,
        titleJa: `${journey.nameJa}のセーブ（旧版）`,
        impactJa: `バージョン${content.version}の形式のため、今の版では再開できません。消去すると、${journey.nameJa}は次に開いたとき新しい旅から始まります。英語ノートは消えません。`,
        keys: [entry(slot.save, raw, contentNote(content))],
      });
    }
    const backups = unusedSaves(entries, slot.backups, true);
    if (backups.length) items.push({
      id: `backup:${journey.id}`, kind: "backup", lockName, ownerJa: journey.nameJa,
      titleJa: `${journey.nameJa}のバックアップ（${backups.length}件）`,
      impactJa: "読み込めなかったセーブを、新しく始める前に退避したものです。ゲームはバックアップを読み込みません。消去すると元のデータは取り出せなくなります。今のセーブと英語ノートは消えません。",
      keys: backups,
    });
  }

  // Milan before journeys had their own slots (no version that wrote these keys took a lock).
  const rootSaves = unusedSaves(entries, [...entries.keys()].filter((key) => key === SAVE_KEY || key.startsWith(ROOT_BACKUP)), true);
  if (rootSaves.length) items.push({
    id: "old_milano:save", kind: "old_milano", lockName: null, ownerJa: "以前のミラノ編",
    titleJa: "以前のミラノ編のセーブ",
    impactJa: "旅行編ごとに保存先を分ける前の、ミラノ編のセーブです。今のゲームは読み込みません。今のミラノ編のセーブと英語ノートは消えません。",
    keys: rootSaves,
  });
  const rootNotes = entries.get(LEARNING_KEY);
  if (rootNotes !== undefined) items.push({
    id: "old_milano:learning", kind: "old_milano", lockName: null, ownerJa: "以前のミラノ編",
    titleJa: "以前のミラノ編の英語ノート",
    impactJa: "旅行編ごとに保存先を分ける前の英語ノートです。今のゲームは読み込みません。消去すると、その記録と復習の印は戻せません。今のミラノ編の英語ノートは消えません。",
    keys: [entry(LEARNING_KEY, rootNotes, "英語ノート")],
  });

  for (const [journeyId, slot] of [...byJourney].filter(([id]) => !known.has(id)).sort(([a], [b]) => a.localeCompare(b))) {
    const name = `旅行編「${journeyId}」`;
    const lockName = slotLockName(journeyPhysicalKey(journeyId, SAVE_KEY));
    const saves = unusedSaves(entries, [...(slot.save === undefined ? [] : [slot.save]), ...slot.backups], true);
    if (saves.length) items.push({
      id: `removed:${journeyId}:save`, kind: "removed_journey", lockName, ownerJa: name,
      titleJa: `この版にない${name}のセーブ`,
      impactJa: "この版のゲームにない旅行編のため、読み込みません。その旅行編がある版で開くと使われるデータです（開発用の見本の編など）。消去すると戻せません。",
      keys: saves,
    });
    if (slot.learning !== undefined) items.push({
      id: `removed:${journeyId}:learning`, kind: "removed_journey", lockName, ownerJa: name,
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
  return [...new Set(items.flatMap((item) => item.lockName === null ? [] : [item.lockName]))].sort();
}

export type OldDataRemoval =
  | { ok: true; removedKeys: string[] }
  | { ok: false; message: string; removedKeys: string[] };

/**
 * Remove the chosen items' keys, all or none: only while each key still holds the value listed and is
 * still listed as removable (another tab or screen may have written it since). Call it while holding
 * `oldDataLockNames` of the chosen items. A key that cannot be removed stops the rest and is reported.
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
