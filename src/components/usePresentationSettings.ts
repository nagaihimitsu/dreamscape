import { useRef, useState } from "react";

const key = "dreamscape.presentation.v1";
interface Preferences {
  schemaVersion: 1;
  // Retained in stored v1 settings so existing and older tabs can still read
  // and safely update them. Dialogue choices now always apply immediately.
  confirmChoices: boolean;
  reduceMotion: boolean;
}
const defaults: Preferences = {
  schemaVersion: 1,
  confirmChoices: true,
  reduceMotion: false,
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
      Object.keys(item).length !== 3
    )
      return null;
    return {
      schemaVersion: 1,
      confirmChoices: item.confirmChoices,
      reduceMotion: item.reduceMotion,
    };
  } catch {
    return null;
  }
}

/** Presentation preferences are independent of game and learning saves. */
export function usePresentationSettings() {
  const [initial] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
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
  const [value, setValue] = useState(initial.value ?? defaults);
  const [error, setError] = useState(
    initial.error ||
      (initial.value
        ? ""
        : "表示設定を読み込めません。元のデータは保持しています。"),
  );
  function update(
    change: Partial<Pick<Preferences, "confirmChoices" | "reduceMotion">>,
  ) {
    if (error) return;
    try {
      if (window.localStorage.getItem(key) !== raw.current) {
        setError(
          "別の画面で表示設定が変更されました。再読み込みしてください。",
        );
        return;
      }
      const next = { ...value, ...change };
      const encoded = JSON.stringify(next);
      window.localStorage.setItem(key, encoded);
      raw.current = encoded;
      setValue(next);
    } catch {
      setError("表示設定を保存できませんでした。");
    }
  }
  return { value, error, update };
}
