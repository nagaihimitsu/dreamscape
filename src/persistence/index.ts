import { GAME_STATE_VERSION, validateGameState, type GameState } from "../domain";
import { getJourneyForCity } from "../content/journeys";

/** Logical slot names. Browser journeys map them to per-journey keys (journey-storage.ts);
 * isolated Debug/test storage uses them as they are. schemaVersion controls compatibility. */
export const SAVE_KEY = "dreamscape.save.v1";
export const LEARNING_KEY = "dreamscape.learning.v1";
/** The current format is validated, not automatically migrated from older versions. */
export const SUPPORTED_SAVE_VERSION = GAME_STATE_VERSION;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  physicalKey?(key: string): string;
  /** Absent for isolated debug/test storage; browser journey slots always set it. */
  journeyId?: string;
}

export type LoadResult =
  | { status: "empty" }
  | { status: "loaded"; state: GameState }
  | { status: "invalid"; kind: "storage" | "newer" | "legacy" | "corrupt" | "journey"; message: string; raw: string | null };

export type SaveResult = { ok: true } | { ok: false; message: string };

export function parseGameState(raw: string): GameState {
  return validateGameState(JSON.parse(raw) as unknown);
}

const wrongJourneyMessage = "保存先の旅行編と現在地の旅行編が一致しないか、現在地を確認できません。元のデータは変更せず保護しています。";

/** Check ownership without imposing a journey on isolated in-memory Debug storage. */
function belongsToSlot(storage: StorageLike, cityId: string): boolean {
  return !storage.journeyId || getJourneyForCity(cityId)?.id === storage.journeyId;
}

function foreignSnapshot(storage: StorageLike, value: unknown): boolean {
  if (!storage.journeyId || !value || typeof value !== "object") return false;
  if (!("schemaVersion" in value) || value.schemaVersion !== SUPPORTED_SAVE_VERSION || !("currentCityId" in value)) return false;
  return typeof value.currentCityId === "string" && !belongsToSlot(storage, value.currentCityId);
}

export function loadGame(storage: StorageLike): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return {
      status: "invalid",
      kind: "storage",
      message:
        "このブラウザの保存領域を読み取れません。保存の設定を確認してください。",
      raw: null,
    };
  }
  if (raw === null) return { status: "empty" };
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return {
      status: "invalid",
      kind: "corrupt",
      message:
        "セーブを読み込めませんでした。保存データの形式を確認できません。元のデータは残っています。",
      raw,
    };
  }
  const version = typeof value === "object" && value !== null && "schemaVersion" in value
    ? value.schemaVersion : undefined;
  if (typeof version === "number" && Number.isInteger(version) && version > SUPPORTED_SAVE_VERSION) {
    return { status: "invalid", kind: "newer", raw,
      message: "このセーブは新しいバージョンで作成されています。アプリを更新してください。元のデータは残っています。" };
  }
  // Older versions are not migrated. The version number alone cannot rule out
  // a damaged file, so the notice says so and keeps the original untouched.
  // Game saves never carry a top-level `kind`; a snapshot that does (e.g. a
  // journey-preparation draft) is not an old game save and falls through to "corrupt".
  const otherSnapshot = typeof value === "object" && value !== null && "kind" in value;
  if (!otherSnapshot && typeof version === "number" && Number.isInteger(version) && version >= 1 && version < SUPPORTED_SAVE_VERSION) {
    return { status: "invalid", kind: "legacy", raw,
      message: `保存データの形式はバージョン${version}です。現在のバージョンでは読み込めません。データの破損によって読み込めない場合もあります。元のデータは残っています。` };
  }
  if (foreignSnapshot(storage, value)) return { status: "invalid", kind: "journey", raw, message: wrongJourneyMessage };
  try {
    return { status: "loaded", state: validateGameState(value) };
  } catch {
    return { status: "invalid", kind: "corrupt", raw,
      message: "セーブを読み込めませんでした。データが壊れているか、このバージョンに対応していません。元のデータは残っています。" };
  }
}

function serialize(state: GameState): string {
  return JSON.stringify(validateGameState(state));
}

/** Compare validated snapshots in the same schema order used for saving. */
export function sameGameState(left: GameState, right: GameState): boolean {
  return serialize(left) === serialize(right);
}

/** Compare with the last observed snapshot before writing; the UI commits only after success. */
export function saveGame(
  storage: StorageLike,
  state: GameState,
  expectedPrevious?: GameState | null,
): SaveResult {
  try {
    if (!belongsToSlot(storage, state.currentCityId)) return { ok: false, message: wrongJourneyMessage };
    const raw = serialize(state);
    const saved = loadGame(storage);
    if (saved.status === "invalid") {
      return {
        ok: false,
        message: "読み込めないセーブを保護するため、上書きしませんでした。",
      };
    }
    const current = saved.status === "loaded" ? serialize(saved.state) : null;
    // Re-saving the exact snapshot is harmless, including a repeated commit.
    if (current === raw) return { ok: true };
    const conflict =
      expectedPrevious !== undefined && current !== (expectedPrevious === null ? null : serialize(expectedPrevious));
    const stale =
      saved.status === "loaded" && state.revision <= saved.state.revision;
    if (conflict || stale) {
      return {
        ok: false,
        message:
          "別の画面でセーブが更新されています。上書きせずに保護しました。ロードして最新の場面から再開してください。",
      };
    }
    storage.setItem(SAVE_KEY, raw);
    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        "保存できませんでした。空き容量やブラウザの保存設定を確認して、もう一度お試しください。",
    };
  }
}

/** Write only while the observed slot still contains the expected snapshot. */
export function writeIfUnchanged(storage: StorageLike, key: string, expected: string | null, next: string): boolean {
  if (storage.getItem(key) !== expected) return false;
  storage.setItem(key, next);
  return true;
}

/** Explicit recovery only: retain the exact original before creating a new game. */
export function backupAndCreate(
  storage: StorageLike,
  state: GameState,
  expectedOriginal?: string | null,
): SaveResult {
  try {
    if (!belongsToSlot(storage, state.currentCityId)) return { ok: false, message: wrongJourneyMessage };
    const replacement = serialize(state);
    const original = storage.getItem(SAVE_KEY);
    const current = loadGame(storage);
    if (current.status === "invalid" && current.kind === "journey") return { ok: false, message: wrongJourneyMessage };
    if (expectedOriginal !== undefined && original !== expectedOriginal)
      return { ok: false, message: "別の画面でセーブが更新されています。再読み込みしてからやり直してください。" };
    if (original !== null) {
      const prefix = `${SAVE_KEY}.backup.${Date.now()}`;
      let key = prefix;
      let suffix = 0;
      while (storage.getItem(key) !== null) key = `${prefix}.${++suffix}`;
      storage.setItem(key, original);
    }
    if (!writeIfUnchanged(storage, SAVE_KEY, original, replacement))
      return { ok: false, message: "別の画面でセーブが更新されています。上書きせずに保護しました。" };
    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        "元のセーブを残して新しく始める処理に失敗しました。保存領域を確認してください。",
    };
  }
}

/** Delete only the two active Dreamscape slots after checking the confirmed snapshot. */
export function deleteSaveData(
  storage: StorageLike & { removeItem(key: string): void },
  expected: { game: string | null; learning: string | null },
): SaveResult {
  try {
    if (
      storage.getItem(SAVE_KEY) !== expected.game ||
      storage.getItem(LEARNING_KEY) !== expected.learning
    )
      return {
        ok: false,
        message:
          "別の画面で保存データが更新されました。再読み込みしてからやり直してください。",
      };
    const current = loadGame(storage);
    if (current.status === "invalid" && current.kind === "journey") return { ok: false, message: wrongJourneyMessage };
    storage.removeItem(LEARNING_KEY);
    try {
      storage.removeItem(SAVE_KEY);
    } catch {
      if (expected.learning !== null && storage.getItem(LEARNING_KEY) === null)
        storage.setItem(LEARNING_KEY, expected.learning);
      throw new Error("Could not remove game save");
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        "消去できませんでした。保存状態を確認してからやり直してください。一部のデータが消去されている場合があります。",
    };
  }
}
