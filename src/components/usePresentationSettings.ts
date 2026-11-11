import { useRef, useState } from "react";
import type { StorageLike } from "../persistence";

const key = "dreamscape.presentation.v1";
interface Preferences {
  schemaVersion: 1;
  // Retained in stored v1 settings so existing and older tabs can still read
  // and safely update them. Dialogue choices now always apply immediately.
  confirmChoices: boolean;
  reduceMotion: boolean;
  autoSave: boolean;
  dialogueSpeed: number;
  autoAdvance: boolean;
  /** 「未読の台詞も高速送りする」 (read-skip): off, fast-forward stops at a line not read before. */
  skipUnread: boolean;
}
const defaults: Preferences = {
  schemaVersion: 1,
  confirmChoices: true,
  reduceMotion: false,
  autoSave: true,
  dialogueSpeed: 25,
  autoAdvance: false,
  skipUnread: false,
};

function read(raw: string | null): Preferences | null {
  if (raw === null) return defaults;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return null;
    const item = data as Record<string, unknown>;
    if (
      item.schemaVersion !== 1 ||
      typeof item.confirmChoices !== "boolean" ||
      typeof item.reduceMotion !== "boolean" ||
      (item.autoSave !== undefined && typeof item.autoSave !== "boolean") ||
      (item.autoAdvance !== undefined && typeof item.autoAdvance !== "boolean") ||
      (item.skipUnread !== undefined && typeof item.skipUnread !== "boolean") ||
      (item.dialogueSpeed !== undefined && ![0, 25, 45].includes(item.dialogueSpeed as number)) ||
      Object.keys(item).some((name) => !["schemaVersion", "confirmChoices", "reduceMotion", "autoSave", "dialogueSpeed", "autoAdvance", "skipUnread"].includes(name))
    )
      return null;
    return {
      schemaVersion: 1,
      confirmChoices: item.confirmChoices,
      reduceMotion: item.reduceMotion,
      autoSave: item.autoSave === undefined ? true : item.autoSave as boolean,
      dialogueSpeed: item.dialogueSpeed === undefined ? 25 : item.dialogueSpeed as number,
      autoAdvance: item.autoAdvance === undefined ? false : item.autoAdvance as boolean,
      skipUnread: item.skipUnread === undefined ? false : item.skipUnread as boolean,
    };
  } catch {
    return null;
  }
}

/** Presentation preferences are independent of game and learning saves. */
export function usePresentationSettings(storage: StorageLike = window.localStorage) {
  const [initial] = useState(() => {
    try {
      const raw = storage.getItem(key);
      return { raw, value: read(raw), error: "" };
    } catch {
      return {
        raw: null,
        value: null,
        error: "表示設定を読み込めませんでした。",
      };
    }
  });
  const raw = useRef(initial.raw);
  // Unknown or unreadable settings must not silently enable automatic writes.
  const [value, setValue] = useState(initial.value ?? { ...defaults, autoSave: false });
  const [error, setError] = useState(
    initial.error ||
      (initial.value
        ? ""
        : "表示設定を読み込めません。元のデータは保持しています。"),
  );
  function update(
    change: Partial<Pick<Preferences, "confirmChoices" | "reduceMotion" | "autoSave" | "dialogueSpeed" | "autoAdvance" | "skipUnread">>,
  ): boolean {
    if (error) return false;
    try {
      if (storage.getItem(key) !== raw.current) {
        setError(
          "別の画面で表示設定が変更されました。再読み込みしてください。",
        );
        return false;
      }
      const next = { ...value, ...change };
      const encoded = JSON.stringify(next);
      storage.setItem(key, encoded);
      raw.current = encoded;
      setValue(next);
      return true;
    } catch {
      setError("表示設定を保存できませんでした。");
      return false;
    }
  }
  return { value, error, update };
}
