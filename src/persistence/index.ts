import { isKnownLegacyGameState, validateGameState, type GameState } from "../domain";

/** Keep the slot stable; schemaVersion inside the payload controls compatibility. */
export const SAVE_KEY = "dreamscape.save.v1";
export const LEARNING_KEY = "dreamscape.learning.v1";
/** The current format is validated, not automatically migrated from older versions. */
export const SUPPORTED_SAVE_VERSION = 12;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type LoadResult =
  | { status: "empty" }
  | { status: "loaded"; state: GameState }
  | { status: "invalid"; kind: "storage" | "newer" | "legacy" | "corrupt"; message: string; raw: string | null };

export type SaveResult = { ok: true } | { ok: false; message: string };

export function parseGameState(raw: string): GameState {
  return validateGameState(JSON.parse(raw) as unknown);
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
  if (isKnownLegacyGameState(value)) {
    return { status: "invalid", kind: "legacy", raw,
      message: `保存データの形式はバージョン${version}です。現在のバージョンでは読み込めません。データの破損によって読み込めない場合もあります。元のデータは残っています。` };
  }
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
  expectedPrevious?: GameState,
): SaveResult {
  try {
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
      expectedPrevious !== undefined && current !== serialize(expectedPrevious);
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

/** Explicit recovery only: retain the exact original before creating a new game. */
export function backupAndCreate(
  storage: StorageLike,
  state: GameState,
  expectedOriginal?: string | null,
): SaveResult {
  try {
    const replacement = serialize(state);
    const original = storage.getItem(SAVE_KEY);
    if (expectedOriginal !== undefined && original !== expectedOriginal)
      return { ok: false, message: "別の画面でセーブが更新されています。再読み込みしてからやり直してください。" };
    if (original !== null) {
      const prefix = `${SAVE_KEY}.backup.${Date.now()}`;
      let key = prefix;
      let suffix = 0;
      while (storage.getItem(key) !== null) key = `${prefix}.${++suffix}`;
      storage.setItem(key, original);
    }
    if (storage.getItem(SAVE_KEY) !== original)
      return { ok: false, message: "別の画面でセーブが更新されています。上書きせずに保護しました。" };
    storage.setItem(SAVE_KEY, replacement);
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
