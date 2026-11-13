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
  /**
   * 「未読の台詞も高速送りする」 (read-skip): off, fast-forward stops at a line not read before. On by default (user
   * decision 2026-11-11: on a first play every line is unread, so stopping made 高速送り move one line only).
   */
  skipUnread: boolean;
  /** 「英語を読み上げるボタンを出す」 (ReadAloud.tsx): on, a speaker button beside the quizzes' English. Off by default. */
  readAloud: boolean;
  /** 「台詞の声を出す」 (useVoice.ts): on, a line's `# voice:` plays its recording. On by default. */
  voice: boolean;
  /** 「声の大きさ」: the voices' volume, from 0 to 1 (the slider's 0 to 100 in tens). */
  voiceVolume: number;
  /** 「効果音を出す」 (src/audio/sound-effects.ts): on, the game's sounds and a line's `# se:` play. On by default. */
  se: boolean;
  /** 「効果音の大きさ」: the sound effects' volume, from 0 to 1 (the slider's 0 to 100 in tens). */
  seVolume: number;
  /** 「BGMを流す」 (src/audio/bgm.ts): on, the background music plays. On by default. */
  bgm: boolean;
  /** 「BGMの大きさ」: the music's volume, from 0 to 1 (the slider's 0 to 100 in tens). */
  bgmVolume: number;
  /** 「環境音を流す」 (src/audio/ambience.ts): on, the places' ambience plays under the music, at half its volume. On by default. */
  ambience: boolean;
  /** 「振動する」 (src/audio/vibration.ts): on, a held item gained or a clue recorded vibrates briefly where the browser can. On by default. */
  vibration: boolean;
}
const defaults: Preferences = {
  schemaVersion: 1,
  confirmChoices: true,
  reduceMotion: false,
  autoSave: true,
  dialogueSpeed: 25,
  autoAdvance: false,
  skipUnread: true,
  readAloud: false,
  voice: true,
  voiceVolume: 0.8,
  se: true,
  seVolume: 0.7,
  bgm: true,
  bgmVolume: 0.4,
  ambience: true,
  vibration: true,
};

const isVolume = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

/** The stored settings (`raw`, null when none are stored: the defaults), or null when they cannot be read safely. */
export function readPresentationSettings(raw: string | null): Preferences | null {
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
      (item.readAloud !== undefined && typeof item.readAloud !== "boolean") ||
      (item.voice !== undefined && typeof item.voice !== "boolean") ||
      (item.voiceVolume !== undefined && !isVolume(item.voiceVolume)) ||
      (item.se !== undefined && typeof item.se !== "boolean") ||
      (item.seVolume !== undefined && !isVolume(item.seVolume)) ||
      (item.bgm !== undefined && typeof item.bgm !== "boolean") ||
      (item.bgmVolume !== undefined && !isVolume(item.bgmVolume)) ||
      (item.ambience !== undefined && typeof item.ambience !== "boolean") ||
      (item.vibration !== undefined && typeof item.vibration !== "boolean") ||
      (item.dialogueSpeed !== undefined && ![0, 25, 45].includes(item.dialogueSpeed as number)) ||
      Object.keys(item).some((name) => !["schemaVersion", "confirmChoices", "reduceMotion", "autoSave", "dialogueSpeed", "autoAdvance", "skipUnread", "readAloud",
        "voice", "voiceVolume", "se", "seVolume", "bgm", "bgmVolume", "ambience", "vibration"].includes(name))
    )
      return null;
    return {
      schemaVersion: 1,
      confirmChoices: item.confirmChoices,
      reduceMotion: item.reduceMotion,
      autoSave: item.autoSave === undefined ? true : item.autoSave as boolean,
      dialogueSpeed: item.dialogueSpeed === undefined ? 25 : item.dialogueSpeed as number,
      autoAdvance: item.autoAdvance === undefined ? false : item.autoAdvance as boolean,
      skipUnread: item.skipUnread === undefined ? true : item.skipUnread as boolean,
      readAloud: item.readAloud === undefined ? false : item.readAloud as boolean,
      voice: item.voice === undefined ? true : item.voice as boolean,
      voiceVolume: item.voiceVolume === undefined ? 0.8 : item.voiceVolume as number,
      se: item.se === undefined ? true : item.se as boolean,
      seVolume: item.seVolume === undefined ? 0.7 : item.seVolume as number,
      bgm: item.bgm === undefined ? true : item.bgm as boolean,
      bgmVolume: item.bgmVolume === undefined ? 0.4 : item.bgmVolume as number,
      ambience: item.ambience === undefined ? true : item.ambience as boolean,
      vibration: item.vibration === undefined ? true : item.vibration as boolean,
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
      return { raw, value: readPresentationSettings(raw), error: "" };
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
    change: Partial<Pick<Preferences, "confirmChoices" | "reduceMotion" | "autoSave" | "dialogueSpeed" | "autoAdvance" | "skipUnread" | "readAloud"
      | "voice" | "voiceVolume" | "se" | "seVolume" | "bgm" | "bgmVolume" | "ambience" | "vibration">>,
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
